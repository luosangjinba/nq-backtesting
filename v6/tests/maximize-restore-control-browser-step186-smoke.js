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

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-columns' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function hostState() {
        return [...document.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => ({
          hidden: host.hidden,
          paneId: host.dataset.v6PaneId,
          slot: host.dataset.v6ChartPaneSlot,
          visible: host.dataset.v6ChartPaneVisible,
        }));
      }

      function buttonState(paneId) {
        const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="' + paneId + '"]');
        const rail = host.querySelector('[data-v6-chart-pane-action-rail]');
        const maximize = rail.querySelector('[data-v6-chart-maximize-restore]');
        const reset = rail.querySelector('[data-v6-reset-view]');
        return {
          maximizeLabel: maximize.querySelector('[data-v6-chart-maximize-label]').textContent.trim(),
          maximizePaneId: maximize.dataset.v6ChartMaximizePaneId,
          maximizeState: maximize.dataset.v6ChartMaximizeState,
          resetPaneId: reset.dataset.v6ResetPaneId,
          title: maximize.getAttribute('title'),
        };
      }

      const before = {
        buttons: {
          main: buttonState('main'),
          secondary: buttonState('secondary'),
          tertiary: buttonState('tertiary'),
        },
        controls: root.__v6MaximizeRestoreControl.controls.length,
        hosts: hostState(),
        surface: root.__v6WorkstationChartSurface.getState(),
      };

      document.querySelector('[data-v6-chart-maximize-restore][data-v6-chart-maximize-pane-id="secondary"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const maximized = {
        button: buttonState('secondary'),
        hosts: hostState(),
        surface: root.__v6WorkstationChartSurface.getState(),
      };

      document.querySelector('[data-v6-chart-maximize-restore][data-v6-chart-maximize-pane-id="secondary"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const restored = {
        button: buttonState('secondary'),
        hosts: hostState(),
        surface: root.__v6WorkstationChartSurface.getState(),
      };

      return {
        applyState,
        before,
        maximized,
        restored,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.before.controls, 3);
  assert.deepEqual(Object.values(value.before.buttons).map((button) => [button.maximizeState, button.title]), [
    ['maximize', 'Maximize chart'],
    ['maximize', 'Maximize chart'],
    ['maximize', 'Maximize chart'],
  ]);
  assert.deepEqual(Object.values(value.before.buttons).map((button) => button.resetPaneId), ['main', 'secondary', 'tertiary']);
  assert.deepEqual(value.maximized.hosts.map((host) => [host.paneId, host.hidden, host.visible, host.slot]), [
    ['main', true, 'false', ''],
    ['secondary', false, 'true', '1'],
    ['tertiary', true, 'false', ''],
  ]);
  assert.equal(value.maximized.surface.maximize.maximizedPaneId, 'secondary');
  assert.deepEqual(value.maximized.button, {
    maximizeLabel: 'Restore chart',
    maximizePaneId: 'secondary',
    maximizeState: 'restore',
    resetPaneId: 'secondary',
    title: 'Restore chart',
  });
  assert.deepEqual(value.restored.hosts.map((host) => [host.paneId, host.hidden, host.visible, host.slot]), [
    ['main', false, 'true', '1'],
    ['secondary', false, 'true', '2'],
    ['tertiary', false, 'true', '3'],
  ]);
  assert.equal(value.restored.surface.maximize.maximizedPaneId, null);
  assert.deepEqual(value.restored.button, {
    maximizeLabel: 'Maximize chart',
    maximizePaneId: 'secondary',
    maximizeState: 'maximize',
    resetPaneId: 'secondary',
    title: 'Maximize chart',
  });
} finally {
  await page.cleanup();
}

console.log('v6 maximize restore control browser step 186 smoke passed');
