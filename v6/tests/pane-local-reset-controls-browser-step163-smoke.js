import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSurfaceBridge.ready;

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
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice' });
      for (let index = 0; index < 12; index += 1) {
        const state = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
        if (state.status === 'bootstrapped' || state.status === 'skipped') break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      const mainChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const secondaryChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 19,
        paneId: 'main',
        spanBars: 24
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: mainChart.revision,
        latestLogicalIndex: Math.max(0, mainChart.bars.length - 1),
        paneId: 'main'
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 33,
        paneId: 'secondary',
        spanBars: 24
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: secondaryChart.revision,
        latestLogicalIndex: Math.max(0, secondaryChart.bars.length - 1),
        paneId: 'secondary'
      });

      const beforeMain = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const beforeSecondary = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' });
      document.querySelector('[data-v6-reset-view][data-v6-reset-pane-id="secondary"]').click();
      let afterSecondary = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' });
      const deadline = performance.now() + 3000;
      while (afterSecondary.intent.origin !== 'default' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        afterSecondary = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterMain = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const surfaceState = root.__v6WorkstationChartSurface.getState();
      return {
        afterMain,
        afterSecondary,
        beforeMain,
        beforeSecondary,
        resetButtons: [...document.querySelectorAll('[data-v6-reset-view]')].map((button) => ({
          hidden: button.closest('[data-v6-chart-engine-host]').hidden,
          paneId: button.dataset.v6ResetPaneId,
        })),
        resetControlCount: root.__v6ResetViewControl.controls.length,
        surfaceAppliedViewport: surfaceState.appliedViewport,
        surfaceLayout: surfaceState.layout,
      };
    })()))()
  `));

  assert.equal(value.resetControlCount, 3);
  assert.deepEqual(value.resetButtons, [
    { hidden: false, paneId: 'main' },
    { hidden: false, paneId: 'secondary' },
    { hidden: true, paneId: 'tertiary' },
  ]);
  assert.deepEqual(value.surfaceLayout.visiblePaneIds, ['main', 'secondary']);
  assert.equal(value.beforeMain.intent.origin, 'manual');
  assert.equal(value.beforeSecondary.intent.origin, 'manual');
  assert.equal(value.afterMain.intent.origin, 'manual');
  assert.equal(value.afterMain.intent.latestOffsetBars, 19);
  assert.equal(value.afterSecondary.intent.origin, 'default');
  assert.equal(value.afterSecondary.intent.spanBars, null);
  assert.equal(value.afterSecondary.projection.origin, 'default');
  assert.deepEqual(value.surfaceAppliedViewport.map((record) => [record.paneId, record.origin]), [
    ['main', 'manual'],
    ['secondary', 'default'],
  ]);
} finally {
  await page.cleanup();
}

console.log('v6 pane-local reset controls browser step 163 smoke passed');
