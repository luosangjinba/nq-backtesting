import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      await document.querySelector('[data-v6-root]').__v6LayoutSurfaceBridge.ready;
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-columns' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function rectOf(element) {
        const rect = element?.getBoundingClientRect();
        return rect ? {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        } : null;
      }

      function readPane(paneId) {
        const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="' + paneId + '"]');
        const rail = host?.querySelector('[data-v6-chart-pane-action-rail]');
        const reset = host?.querySelector('[data-v6-reset-view]');
        return {
          host: rectOf(host),
          hidden: Boolean(host?.hidden),
          rail: rectOf(rail),
          reset: rectOf(reset),
          resetPaneId: reset?.dataset.v6ResetPaneId || null,
          resetPosition: getComputedStyle(reset).position,
          title: reset?.getAttribute('title') || '',
        };
      }

      return {
        applyState,
        layout: document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState().layout,
        panes: {
          main: readPane('main'),
          secondary: readPane('secondary'),
          tertiary: readPane('tertiary'),
        },
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.deepEqual(value.layout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  for (const paneId of ['main', 'secondary', 'tertiary']) {
    const pane = value.panes[paneId];
    assert.equal(pane.hidden, false);
    assert.equal(pane.resetPaneId, paneId);
    assert.equal(pane.resetPosition, 'relative');
    assert.equal(pane.title, 'Reset chart view');
    assert.equal(pane.reset.right < pane.host.right - 52, true, `${paneId} reset should not overlap price axis`);
    assert.equal(pane.reset.left > pane.host.left, true, `${paneId} reset should stay inside pane`);
    assert.equal(pane.rail.top >= pane.host.top, true, `${paneId} rail should stay inside pane`);
  }
} finally {
  await page.cleanup();
}

console.log('v6 pane action rail browser step 184 smoke passed');
