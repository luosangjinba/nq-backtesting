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

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initialChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const initialCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const initialReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const initialSurface = root.__v6WorkstationChartSurface.getState();

      const extension = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        paneId: 'main',
        visibleRange: { from: -4, to: 20 },
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const afterCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const afterReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterSurface = root.__v6WorkstationChartSurface.getState();
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });

      return {
        after: {
          barCount: afterChart.bars?.length || 0,
          cache: afterCache,
          oldestTimestamp: afterChart.bars?.[0]?.timestamp || null,
          replay: afterReplay,
          visibleLatest: latestVisible(afterChart, afterSurface),
          viewport,
        },
        applyState,
        bridgeMounted: Boolean(root.__v6LeftwardHistoryInputBridge?.destroy),
        extension,
        initial: {
          barCount: initialChart.bars?.length || 0,
          cache: initialCache,
          oldestTimestamp: initialChart.bars?.[0]?.timestamp || null,
          replay: initialReplay,
          visibleLatest: latestVisible(initialChart, initialSurface),
        },
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.bridgeMounted, true);
  assert.equal(value.initial.visibleLatest, true);
  assert.equal(value.extension.status, 'loaded');
  assert.equal(value.extension.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(value.extension.extension.plannedWindow.historyRequest, 'older-window');
  assert.equal(value.extension.extension.prependedBarCount > 0, true);
  assert.equal(value.after.barCount > value.initial.barCount, true);
  assert.equal(value.after.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(value.after.cache.windowCount > value.initial.cache.windowCount, true);
  assert.deepEqual(value.after.replay, value.initial.replay);
  assert.equal(value.after.visibleLatest, true);
  assert.equal(value.after.viewport.chartBarsRevision > 0, true);
} finally {
  await page.cleanup();
}

console.log('v6 leftward history extension browser step 148 smoke passed');
