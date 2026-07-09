import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const state = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const hostPaneIds = [...document.querySelectorAll('[data-v6-chart-engine-host]')]
        .map((host) => host.dataset.v6PaneId);

      const initialSnapshot = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_SNAPSHOT);
      const missingMainBefore = await commands.dispatchCommand(
        contracts.PANE_COMMANDS.GET_BY_ID,
        'main',
      );

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'pane-default',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();

      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const finalSnapshot = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_SNAPSHOT);
      const activePane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
      const missingMainAfter = await commands.dispatchCommand(
        contracts.PANE_COMMANDS.GET_BY_ID,
        'main',
      );
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, {
        paneId: 'main',
      });
      const projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const surface = root.__v6WorkstationChartSurface.getState();
      const mainSurfacePane = surface.panes.find((pane) => pane.paneId === 'main') || null;

      return {
        activePane,
        applyState,
        chart,
        finalSnapshot,
        hostPaneIds,
        initialSnapshot,
        mainSurfacePane,
        missingMainAfter,
        missingMainBefore,
        projectionState,
      };
    })()))()
  `));

  assert.deepEqual(state.hostPaneIds, ['main', 'secondary', 'tertiary']);
  assert.equal(state.initialSnapshot.defaultPaneId, 'pane-default');
  assert.equal(state.initialSnapshot.activePaneId, 'pane-default');
  assert.equal(state.initialSnapshot.panes.length, 1);
  assert.equal(state.initialSnapshot.panes[0].id, 'pane-default');
  assert.equal(state.missingMainBefore, null);
  assert.equal(state.applyState.status, 'applied');
  assert.equal(state.activePane.id, 'pane-default');
  assert.equal(state.activePane.displayTimeframe, 5);
  assert.equal(state.finalSnapshot.panes.length, 1);
  assert.equal(state.missingMainAfter, null);
  assert.equal(state.chart.paneId, 'main');
  assert.equal(state.chart.bars.length > 0, true);
  assert.equal(state.projectionState.lastProjection.targetTimeframe, 5);
  assert.equal(state.mainSurfacePane.paneId, 'main');
  assert.equal(state.mainSurfacePane.snapshot.dataLength, state.chart.bars.length);
} finally {
  await page.cleanup();
}

console.log('v6 pane identity display timeframe browser step 202 smoke passed');
