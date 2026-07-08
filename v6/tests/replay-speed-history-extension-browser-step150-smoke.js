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

      function latestVisible(chartRecord, surfaceState) {
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        const visibleRange = surfaceState.panes[0]?.snapshot?.visibleLogicalRange;
        return Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        );
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

      async function waitForVisibleBarCountGreaterThan(previousCount) {
        const startedAt = performance.now();
        const deadline = startedAt + 5000;
        let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        let surfaceState = root.__v6WorkstationChartSurface.getState();
        while (
          ((chartRecord.bars?.length || 0) <= previousCount || !latestVisible(chartRecord, surfaceState)) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
          surfaceState = root.__v6WorkstationChartSurface.getState();
        }
        return {
          chartRecord,
          latencyMs: performance.now() - startedAt,
          surfaceState,
          visibleLatest: latestVisible(chartRecord, surfaceState),
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initialChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const initialCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const initialReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      const extension = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        paneId: 'main',
        visibleRange: { from: -4, to: 20 },
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterHistoryChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const afterHistoryCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const afterHistoryReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterHistorySurface = root.__v6WorkstationChartSurface.getState();

      const nextStartedAt = performance.now();
      const nextState = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
      const afterNext = await waitForVisibleBarCountGreaterThan(afterHistoryChart.bars?.length || 0);
      const afterNextReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterNextCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);

      return {
        afterHistory: {
          barCount: afterHistoryChart.bars?.length || 0,
          cache: afterHistoryCache,
          oldestTimestamp: afterHistoryChart.bars?.[0]?.timestamp || null,
          replay: afterHistoryReplay,
          visibleLatest: latestVisible(afterHistoryChart, afterHistorySurface),
        },
        afterNext: {
          barCount: afterNext.chartRecord.bars?.length || 0,
          cache: afterNextCache,
          latestTimestamp: afterNext.chartRecord.bars?.at(-1)?.timestamp || null,
          replay: afterNextReplay,
          visibleLatest: afterNext.visibleLatest,
          visibleLatencyMs: afterNext.latencyMs,
        },
        applyState,
        extension,
        initial: {
          barCount: initialChart.bars?.length || 0,
          cache: initialCache,
          latestTimestamp: initialChart.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: initialChart.bars?.[0]?.timestamp || null,
          replay: initialReplay,
        },
        nextCommandLatencyMs: performance.now() - nextStartedAt,
        nextState,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.extension.status, 'loaded');
  assert.equal(value.extension.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(value.extension.extension.plannedWindow.historyRequest, 'older-window');
  assert.equal(value.extension.extension.prependedBarCount > 0, true);
  assert.equal(value.afterHistory.barCount > value.initial.barCount, true);
  assert.equal(value.afterHistory.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(value.afterHistory.cache.windowCount > value.initial.cache.windowCount, true);
  assert.deepEqual(value.afterHistory.replay, value.initial.replay);
  assert.equal(value.afterHistory.visibleLatest, true);

  assert.equal(value.nextState.status, 'advanced', value.nextState.error || 'manual next should advance');
  assert.equal(value.afterNext.barCount, value.afterHistory.barCount + 1);
  assert.equal(value.afterNext.latestTimestamp > value.initial.latestTimestamp, true);
  assert.equal(value.afterNext.replay.cursorIndex, value.initial.replay.cursorIndex + 1);
  assert.equal(value.afterNext.replay.revealedCount, value.initial.replay.revealedCount + 1);
  assert.equal(value.afterNext.cache.windowCount >= value.afterHistory.cache.windowCount, true);
  assert.equal(value.afterNext.visibleLatest, true);
  assert.equal(value.nextCommandLatencyMs < 120, true);
  assert.equal(value.afterNext.visibleLatencyMs < 160, true);
} finally {
  await page.cleanup();
}

console.log('v6 replay speed history extension browser step 150 smoke passed');
