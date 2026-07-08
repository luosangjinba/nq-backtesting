import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      await document.querySelector('[data-v6-root]').__v6LayoutSurfaceBridge.ready;
      const root = document.querySelector('[data-v6-root]');

      await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.REPLACE_BARS, {
        bars: [
          { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780329600 },
          { close: 101.5, high: 102, low: 100, open: 101, timestamp: 1780329660 }
        ],
        cursorTimestamp: 1780329660,
        paneId: 'main'
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
        cursorTimestamp: 1780329660,
        paneId: 'main'
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: 1,
        latestLogicalIndex: 1,
        paneId: 'main'
      });

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple' });
      for (let index = 0; index < 12; index += 1) {
        const state = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
        if (state.status === 'bootstrapped' || state.status === 'skipped') break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      const chartSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      const viewportSnapshot = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT);
      const bootstrapState = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
      const surfaceState = root.__v6WorkstationChartSurface.getState();
      return {
        bootstrapState,
        chartSummary,
        surfaceAppliedChartData: surfaceState.appliedChartData,
        surfaceAppliedViewport: surfaceState.appliedViewport,
        surfaceLayout: surfaceState.layout,
        viewportSnapshot,
      };
    })()))()
  `));

  assert.equal(value.bootstrapState.status, 'bootstrapped');
  assert.equal(value.bootstrapState.lastResult.sourcePaneId, 'main');
  assert.deepEqual(value.bootstrapState.lastResult.bootstrapped.map((record) => record.paneId), ['secondary', 'tertiary']);
  assert.deepEqual(value.chartSummary.panes.map((pane) => [pane.paneId, pane.barCount]), [
    ['main', 2],
    ['secondary', 2],
    ['tertiary', 2],
  ]);
  assert.deepEqual(value.surfaceLayout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.deepEqual(value.surfaceAppliedChartData.map((record) => [record.paneId, record.barCount]), [
    ['main', 2],
    ['secondary', 2],
    ['tertiary', 2],
  ]);
  assert.deepEqual(value.surfaceAppliedViewport.map((record) => [record.paneId, Boolean(record.projectionRevision >= 0)]), [
    ['main', true],
    ['secondary', true],
    ['tertiary', true],
  ]);
  assert.deepEqual(value.viewportSnapshot.panes.map((pane) => [pane.paneId, Boolean(pane.projection)]), [
    ['main', true],
    ['secondary', true],
    ['tertiary', true],
  ]);
} finally {
  await page.cleanup();
}

console.log('v6 layout pane data bootstrap browser step 162 smoke passed');
