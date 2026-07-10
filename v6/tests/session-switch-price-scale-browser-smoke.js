import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      async function waitForSessionChart(sessionId) {
        const deadline = performance.now() + 6000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE).catch(() => null);
        let chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        while (
          (
            applyState.status !== 'applied' ||
            applyState.applied?.sessionId !== sessionId ||
            replay?.sessionId !== sessionId ||
            !chart.bars?.length
          ) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE).catch(() => null);
          chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { applyState, chart, replay };
      }

      function latestVisible(chartRecord, surfaceState) {
        const paneSnapshot = surfaceState.panes[0]?.snapshot || {};
        const visibleRange = paneSnapshot.visibleLogicalRange;
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        return Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        );
      }

      function sampleCandleVerticalSpread() {
        const host = document.querySelector('[data-v6-chart-engine-host]');
        const canvases = [...host.querySelectorAll('canvas')];
        let maxY = -Infinity;
        let minY = Infinity;
        let candlePixels = 0;
        let sampledPixels = 0;
        for (const canvas of canvases) {
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) continue;
          const width = canvas.width;
          const height = canvas.height;
          const stepX = Math.max(1, Math.floor(width / 160));
          const stepY = Math.max(1, Math.floor(height / 120));
          for (let y = 0; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
              const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
              sampledPixels += 1;
              const greenCandle = green > 120 && red < 130 && blue < 190;
              const redCandle = red > 170 && green < 145 && blue < 170;
              if (alpha > 0 && (greenCandle || redCandle)) {
                candlePixels += 1;
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
              }
            }
          }
        }
        return {
          candlePixels,
          sampledPixels,
          verticalSpread: Number.isFinite(maxY - minY) ? maxY - minY : 0,
        };
      }

      const first = await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-05-29T23:00:00.000Z',
        name: 'Price scale high range',
        startTime: '2026-05-14T21:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const firstLoaded = await waitForSessionChart(first.id);
      const firstSurface = root.__v6WorkstationChartSurface.getState();
      const firstSpread = sampleCandleVerticalSpread();

      const second = await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-02T23:00:00.000Z',
        name: 'Price scale low range',
        startTime: '2025-12-29T22:04:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const secondLoaded = await waitForSessionChart(second.id);
      const secondSurface = root.__v6WorkstationChartSurface.getState();
      const secondSpread = sampleCandleVerticalSpread();

      document.querySelector('[data-v6-dashboard-toggle]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rowOpenButton = document.querySelector('[data-v6-dashboard-open-session="' + first.id + '"]');
      rowOpenButton.click();
      const reopenedFirstLoaded = await waitForSessionChart(first.id);
      const reopenedFirstSurface = root.__v6WorkstationChartSurface.getState();
      const reopenedFirstSpread = sampleCandleVerticalSpread();

      document.querySelector('[data-v6-reset-view][data-v6-reset-pane-id="main"]').click();
      const resetDeadline = performance.now() + 3000;
      let resetViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      while (resetViewport.intent.origin !== 'default' && performance.now() < resetDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        resetViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const resetSurface = root.__v6WorkstationChartSurface.getState();
      const resetSpread = sampleCandleVerticalSpread();

      return {
        first: {
          appliedSessionId: firstLoaded.applyState.applied?.sessionId || null,
          barCount: firstLoaded.chart.bars?.length || 0,
          latestVisible: latestVisible(firstLoaded.chart, firstSurface),
          sessionId: first.id,
          spread: firstSpread,
        },
        reset: {
          latestVisible: latestVisible(secondLoaded.chart, resetSurface),
          spread: resetSpread,
          viewportOrigin: resetViewport.intent.origin,
        },
        second: {
          appliedSessionId: secondLoaded.applyState.applied?.sessionId || null,
          barCount: secondLoaded.chart.bars?.length || 0,
          latestVisible: latestVisible(secondLoaded.chart, secondSurface),
          sessionId: second.id,
          spread: secondSpread,
        },
        reopenedFirst: {
          appliedSessionId: reopenedFirstLoaded.applyState.applied?.sessionId || null,
          barCount: reopenedFirstLoaded.chart.bars?.length || 0,
          latestVisible: latestVisible(reopenedFirstLoaded.chart, reopenedFirstSurface),
          sessionId: first.id,
          spread: reopenedFirstSpread,
        },
      };
    })()))()
  `));

  assert.equal(value.first.appliedSessionId, value.first.sessionId);
  assert.equal(value.first.barCount > 0, true);
  assert.equal(value.first.latestVisible, true);
  assert.equal(value.first.spread.candlePixels > 0, true);
  assert.equal(value.first.spread.verticalSpread > 80, true);
  assert.equal(value.second.appliedSessionId, value.second.sessionId);
  assert.equal(value.second.barCount > 0, true);
  assert.equal(value.second.latestVisible, true);
  assert.equal(value.second.spread.candlePixels > 0, true);
  assert.equal(value.second.spread.verticalSpread > 80, true);
  assert.equal(value.reopenedFirst.appliedSessionId, value.reopenedFirst.sessionId);
  assert.equal(value.reopenedFirst.barCount > 0, true);
  assert.equal(value.reopenedFirst.latestVisible, true);
  assert.equal(value.reopenedFirst.spread.candlePixels > 0, true);
  assert.equal(value.reopenedFirst.spread.verticalSpread > 80, true);
  assert.equal(value.reset.viewportOrigin, 'default');
  assert.equal(value.reset.latestVisible, true);
  assert.equal(value.reset.spread.verticalSpread > 80, true);
} finally {
  await page.cleanup();
}

console.log('v6 session switch price scale browser smoke passed');
