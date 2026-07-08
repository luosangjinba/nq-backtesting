import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host]');

      function latestVisible(chartRecord, surfaceState) {
        const paneSnapshot = surfaceState.panes[0]?.snapshot || {};
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        const visibleRange = paneSnapshot.visibleLogicalRange;
        return {
          latestLogicalIndex,
          paneSnapshot,
          visible: Boolean(
            visibleRange &&
            Number(visibleRange.from) <= latestLogicalIndex &&
            Number(visibleRange.to) >= latestLogicalIndex
          ),
          visibleRange,
        };
      }

      function countCandlePixels() {
        const canvases = [...host.querySelectorAll('canvas')];
        let candlePixelCount = 0;
        let sampledPixelCount = 0;
        for (const canvas of canvases) {
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) continue;
          const width = canvas.width;
          const height = canvas.height;
          const stepX = Math.max(1, Math.floor(width / 96));
          const stepY = Math.max(1, Math.floor(height / 48));
          for (let y = 0; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
              const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
              sampledPixelCount += 1;
              const greenCandle = green > 120 && red < 120 && blue < 180;
              const redCandle = red > 170 && green < 140 && blue < 160;
              if (alpha > 0 && (greenCandle || redCandle)) {
                candlePixelCount += 1;
              }
            }
          }
        }
        return { candlePixelCount, canvasCount: canvases.length, sampledPixelCount };
      }

      async function waitForApplied() {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        return applyState;
      }

      async function waitForBarCountGreaterThan(previousCount) {
        const startedAt = performance.now();
        const deadline = startedAt + 5000;
        let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        let surfaceState = root.__v6WorkstationChartSurface.getState();
        let visible = latestVisible(chartRecord, surfaceState);
        while (
          ((chartRecord.bars?.length || 0) <= previousCount || !visible.visible) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
          surfaceState = root.__v6WorkstationChartSurface.getState();
          visible = latestVisible(chartRecord, surfaceState);
        }
        return {
          chartRecord,
          latencyMs: performance.now() - startedAt,
          surfaceState,
          visible,
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initialChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const initialReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const initialSurface = root.__v6WorkstationChartSurface.getState();
      const initialVisible = latestVisible(initialChart, initialSurface);
      const initialPixels = countCandlePixels();
      const initialCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);

      const nextStartedAt = performance.now();
      const nextState = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
      const afterNext = await waitForBarCountGreaterThan(initialChart.bars?.length || 0);
      const afterNextReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterNextPixels = countCandlePixels();
      const afterNextCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);

      return {
        afterNext: {
          barCount: afterNext.chartRecord.bars?.length || 0,
          latestTimestamp: afterNext.chartRecord.bars?.at(-1)?.timestamp || null,
          visible: afterNext.visible,
          visibleLatencyMs: afterNext.latencyMs,
        },
        afterNextCache,
        afterNextPixels,
        afterNextReplay,
        applyState,
        hostVisible: Boolean(host && host.getBoundingClientRect().width > 0 && host.getBoundingClientRect().height > 0),
        initial: {
          barCount: initialChart.bars?.length || 0,
          latestTimestamp: initialChart.bars?.at(-1)?.timestamp || null,
          replayCursorTime: initialReplay.cursorTime,
          visible: initialVisible,
        },
        initialCache,
        initialPixels,
        nextCommandLatencyMs: performance.now() - nextStartedAt,
        nextState,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.hostVisible, true);
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.initial.visible.visible, true);
  assert.equal(value.initialPixels.canvasCount > 0, true);
  assert.equal(value.initialPixels.sampledPixelCount > 0, true);
  assert.equal(value.initialPixels.candlePixelCount > 0, true);
  assert.equal(value.initialCache.windowCount >= 1, true);

  assert.equal(value.nextState.status, 'advanced');
  assert.equal(value.afterNext.barCount, value.initial.barCount + 1);
  assert.equal(value.afterNext.latestTimestamp > value.initial.latestTimestamp, true);
  assert.equal(value.afterNext.visible.visible, true);
  assert.equal(value.afterNextReplay.cursorTime > value.initial.replayCursorTime, true);
  assert.equal(value.afterNextPixels.candlePixelCount > 0, true);
  assert.equal(value.afterNextCache.windowCount >= value.initialCache.windowCount, true);
  assert.equal(value.afterNext.visibleLatencyMs < 120, true);
} finally {
  await page.cleanup();
}

console.log('v6 replay k-line chart flow browser step 145 smoke passed');
