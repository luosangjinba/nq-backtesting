import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const layoutDetails = document.querySelector('[data-v6-layout-menu-details]');
      const layoutButton = document.querySelector('[data-v6-top-page-layout]');
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      const chartHost = document.querySelector('[data-v6-chart-engine-host]');
      layoutButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const beforeSurface = chartSurface.getBoundingClientRect();
      const beforeHost = chartHost.getBoundingClientRect();
      const before = await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.GET_SNAPSHOT);
      const twiceButton = document.querySelector('[data-v6-layout-mode="twice"][data-v6-layout-variant="twice-vertical"]');
      twiceButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterMode = await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.GET_SNAPSHOT);
      const crosshair = document.querySelector('[data-v6-layout-sync="crosshair"]');
      crosshair.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterSync = await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.GET_SNAPSHOT);
      const afterSurface = chartSurface.getBoundingClientRect();
      const afterHost = chartHost.getBoundingClientRect();

      return {
        afterHost: {
          height: Math.round(afterHost.height),
          width: Math.round(afterHost.width),
        },
        afterMode,
        afterSurface: {
          height: Math.round(afterSurface.height),
          width: Math.round(afterSurface.width),
        },
        afterSync,
        before,
        beforeHost: {
          height: Math.round(beforeHost.height),
          width: Math.round(beforeHost.width),
        },
        beforeSurface: {
          height: Math.round(beforeSurface.height),
          width: Math.round(beforeSurface.width),
        },
        layoutMenuOpen: layoutDetails.open,
        optionDisabled: [...document.querySelectorAll('[data-v6-layout-mode]')].map((button) => button.disabled),
        selectedModes: [...document.querySelectorAll('[data-v6-layout-mode].is-selected')].map((button) => ({
          mode: button.dataset.v6LayoutMode,
          variant: button.dataset.v6LayoutVariant,
          checked: button.getAttribute('aria-checked'),
        })),
        syncChecked: Object.fromEntries([...document.querySelectorAll('[data-v6-layout-sync]')].map((input) => [input.dataset.v6LayoutSync, input.checked])),
        syncDisabled: [...document.querySelectorAll('[data-v6-layout-sync]')].map((input) => input.disabled),
      };
    })()))()
  `));

  assert.equal(value.layoutMenuOpen, true);
  assert.equal(value.before.mode, 'single');
  assert.equal(value.afterMode.mode, 'twice');
  assert.equal(value.afterSync.mode, 'twice');
  assert.equal(value.afterSync.sync.crosshair, true);
  assert.deepEqual(value.optionDisabled, [false, false, false, false, false, false, false]);
  assert.deepEqual(value.syncDisabled, [false, false, false, false, false]);
  assert.deepEqual(value.selectedModes, [
    { checked: 'true', mode: 'twice', variant: 'twice-vertical' },
  ]);
  assert.equal(value.syncChecked.crosshair, true);
  assert.deepEqual(value.afterSurface, value.beforeSurface);
  assert.deepEqual(value.afterHost, value.beforeHost);
} finally {
  await page.cleanup();
}

console.log('v6 layout menu owner binding browser step 160 smoke passed');
