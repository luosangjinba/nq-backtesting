import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSurfaceBridge.ready;

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-right-stack' });
      for (let index = 0; index < 12; index += 1) {
        const state = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
        if (state.status === 'bootstrapped' || state.status === 'skipped') break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function hostState() {
        return [...document.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => ({
          hidden: host.hidden,
          paneId: host.dataset.v6PaneId,
          slot: host.dataset.v6ChartPaneSlot,
          visible: host.dataset.v6ChartPaneVisible,
        }));
      }

      const beforeChartSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      const beforeReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const beforeSurface = root.__v6WorkstationChartSurface.getState();
      const beforeViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT);

      const maximizedLayout = root.__v6WorkstationChartSurface.maximizePane('secondary');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const duringChartSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      const duringReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const duringSurface = root.__v6WorkstationChartSurface.getState();
      const duringViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT);
      const duringHosts = hostState();

      const restoredLayout = root.__v6WorkstationChartSurface.restorePane();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterChartSummary = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SUMMARY);
      const afterReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterSurface = root.__v6WorkstationChartSurface.getState();
      const afterViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT);
      const afterHosts = hostState();

      return {
        afterChartSummary,
        afterHosts,
        afterReplay,
        afterSurface,
        afterViewport,
        applyState,
        beforeChartSummary,
        beforeReplay,
        beforeSurface,
        beforeViewport,
        duringChartSummary,
        duringHosts,
        duringReplay,
        duringSurface,
        duringViewport,
        maximizedLayout,
        restoredLayout,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.deepEqual(value.beforeSurface.layout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.deepEqual(value.maximizedLayout.visiblePaneIds, ['secondary']);
  assert.equal(value.duringSurface.maximize.maximizedPaneId, 'secondary');
  assert.deepEqual(value.duringSurface.maximize.restoreLayout, {
    mode: 'triple',
    paneCount: 3,
    variant: 'triple-right-stack',
    visiblePaneIds: ['main', 'secondary', 'tertiary'],
  });
  assert.deepEqual(value.duringHosts.map((host) => [host.paneId, host.hidden, host.visible, host.slot]), [
    ['main', true, 'false', ''],
    ['secondary', false, 'true', '1'],
    ['tertiary', true, 'false', ''],
  ]);
  assert.deepEqual(value.restoredLayout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.equal(value.afterSurface.maximize.maximizedPaneId, null);
  assert.equal(value.afterSurface.maximize.restoreLayout, null);
  assert.deepEqual(value.afterHosts.map((host) => [host.paneId, host.hidden, host.visible, host.slot]), [
    ['main', false, 'true', '1'],
    ['secondary', false, 'true', '2'],
    ['tertiary', false, 'true', '3'],
  ]);

  assert.deepEqual(value.duringChartSummary, value.beforeChartSummary);
  assert.deepEqual(value.afterChartSummary, value.beforeChartSummary);
  assert.deepEqual(value.duringViewport, value.beforeViewport);
  assert.deepEqual(value.afterViewport, value.beforeViewport);
  assert.equal(value.duringReplay.cursorIndex, value.beforeReplay.cursorIndex);
  assert.equal(value.afterReplay.cursorIndex, value.beforeReplay.cursorIndex);
  assert.equal(value.duringReplay.status, value.beforeReplay.status);
  assert.equal(value.afterReplay.status, value.beforeReplay.status);
} finally {
  await page.cleanup();
}

console.log('v6 pane maximize state browser step 185 smoke passed');
