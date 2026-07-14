import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });
try {
  await evaluate(page.client, `localStorage.removeItem('v6.persistence.records')`);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const commands = await import('/v6/src/runtime/commands.js');
      await root.__v6SettingsCurrentPriceBridge.ready;
      const states = () => [...document.querySelectorAll('[data-v6-chart-engine-host]')]
        .map((host) => JSON.parse(host.dataset.v6CurrentPriceSettings));
      emitEvent(contracts.PANE_EVENTS.SYMBOL_INTENT_CHANGED, { id: 'secondary', instrument: 'ES' });
      emitEvent(contracts.PANE_EVENTS.SYMBOL_INTENT_CHANGED, { id: 'tertiary', instrument: 'YM' });
      const before = states();
      document.querySelector('[data-v6-settings-toggle]').click();
      document.querySelector('[data-v6-settings-tab="scales"]').click();
      for (const key of ['currentPriceLineVisible', 'currentPriceNameVisible', 'currentPriceValueVisible']) {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        field.checked = false;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const whileDraft = states();
      document.querySelector('[data-v6-settings-close-secondary]').click();
      document.querySelector('[data-v6-settings-toggle]').click();
      document.querySelector('[data-v6-settings-tab="scales"]').click();
      const afterCancel = root.__v6SettingsPanel.getState().settings;
      for (const key of ['currentPriceLineVisible', 'currentPriceNameVisible', 'currentPriceValueVisible']) {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        field.checked = false;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { after: states(), afterCancel, before, committed: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT), whileDraft };
    })()))()
  `));
  assert.deepEqual(value.whileDraft, value.before);
  assert.equal(value.afterCancel.currentPriceLineVisible, true);
  assert.deepEqual(value.before.map((state) => state.symbol), ['NQ', 'ES', 'YM']);
  assert.equal(value.after.every((state) => !state.currentPriceLineVisible && !state.currentPriceNameVisible && !state.currentPriceValueVisible), true);
  assert.equal(value.committed.currentPriceLineVisible, false);

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => { const root = document.querySelector('[data-v6-root]'); await root.__v6SettingsCurrentPriceBridge.ready; return JSON.stringify([...document.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => JSON.parse(host.dataset.v6CurrentPriceSettings))); })()
  `));
  assert.equal(restored.every((state) => !state.currentPriceLineVisible && !state.currentPriceNameVisible && !state.currentPriceValueVisible), true);
} finally { await page.cleanup(); }

console.log('V6 Settings Current Price browser Step 415 smoke passed.');
