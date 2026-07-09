import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'twice-vertical' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function readHost(paneId) {
        const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="' + paneId + '"]');
        return {
          active: host?.dataset.v6ChartPaneActive,
          afterBoxShadow: getComputedStyle(host, '::after').boxShadow,
          height: Math.round(host?.getBoundingClientRect().height || 0),
          hidden: host?.hidden || false,
          width: Math.round(host?.getBoundingClientRect().width || 0),
        };
      }

      const initial = {
        main: readHost('main'),
        secondary: readHost('secondary'),
      };

      document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="secondary"]')
        ?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterSecondary = {
        main: readHost('main'),
        secondary: readHost('secondary'),
        state: document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState(),
      };

      return { afterSecondary, initial };
    })()))()
  `));

  assert.equal(value.initial.main.active, 'true');
  assert.equal(value.initial.secondary.active, 'false');
  assert.match(value.initial.main.afterBoxShadow, /90, 171, 255/);
  assert.doesNotMatch(value.initial.secondary.afterBoxShadow, /90, 171, 255/);
  assert.equal(value.afterSecondary.main.active, 'false');
  assert.equal(value.afterSecondary.secondary.active, 'true');
  assert.equal(value.afterSecondary.state.activePaneId, 'secondary');
  assert.doesNotMatch(value.afterSecondary.main.afterBoxShadow, /90, 171, 255/);
  assert.match(value.afterSecondary.secondary.afterBoxShadow, /90, 171, 255/);
  assert.equal(value.initial.secondary.hidden, false);
  assert.equal(value.afterSecondary.secondary.hidden, false);
  assert.equal(value.initial.main.width, value.afterSecondary.main.width);
  assert.equal(value.initial.secondary.height, value.afterSecondary.secondary.height);
} finally {
  await page.cleanup();
}

console.log('v6 pane active visual outline browser smoke passed');
