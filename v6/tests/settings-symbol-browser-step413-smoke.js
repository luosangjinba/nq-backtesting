import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';
const expected = {
  symbolBordersVisible: true,
  symbolDownBodyColor: '#112233',
  symbolDownBorderColor: '#223344',
  symbolDownWickColor: '#334455',
  symbolPricePrecision: '4',
  symbolUpBodyColor: '#aabbcc',
  symbolUpBorderColor: '#bbccdd',
  symbolUpWickColor: '#ccddee',
  symbolWicksVisible: false,
};

const page = await openV6Page({ height: 820, width: 1280 });
try {
  await evaluate(page.client, `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );

  const committed = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const surface = document.querySelector('[data-v6-chart-surface]');
      await root.__v6SettingsSymbolChartSurfaceBridge.ready;
      await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.UPDATE, {
        chartBackgroundColor: '#010203',
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const beforeState = JSON.parse(surface.dataset.v6SymbolSettings);

      const openSymbol = async () => {
        document.querySelector('[data-v6-settings-toggle]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.querySelector('[data-v6-settings-tab="symbol"]').click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      };
      const edit = (values) => Object.entries(values).forEach(([key, value]) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        if (field.type === 'checkbox') field.checked = value;
        else field.value = String(value);
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await openSymbol();
      const tabState = {
        active: root.__v6SettingsPanel.getState().activeTab,
        canvasHidden: document.querySelector('[data-v6-settings-tab-panel="canvas"]').hidden,
        symbolHidden: document.querySelector('[data-v6-settings-tab-panel="symbol"]').hidden,
      };
      edit(${JSON.stringify(expected)});
      const draftState = JSON.parse(surface.dataset.v6SymbolSettings);
      document.querySelector('[data-v6-settings-close-secondary]').click();

      await openSymbol();
      const restoredAfterCancel = Object.fromEntries(Object.keys(${JSON.stringify(expected)}).map((key) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        return [key, field.type === 'checkbox' ? field.checked : field.value];
      }));
      edit(${JSON.stringify(expected)});
      document.querySelector('[data-v6-settings-reset-draft]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const resetState = root.__v6SettingsPanel.getState().settings;
      edit(${JSON.stringify(expected)});
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 40));

      return {
        afterSettings: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        afterState: JSON.parse(surface.dataset.v6SymbolSettings),
        beforeState,
        draftState,
        resetState,
        restoredAfterCancel,
        tabState,
      };
    })()))()
  `));
  assert.deepEqual(committed.draftState, committed.beforeState);
  assert.equal(committed.tabState.active, 'symbol');
  assert.equal(committed.tabState.canvasHidden, true);
  assert.equal(committed.tabState.symbolHidden, false);
  assert.equal(committed.resetState.chartBackgroundColor, '#010203');
  assert.equal(committed.resetState.symbolPricePrecision, 'auto');
  assert.equal(committed.restoredAfterCancel.symbolPricePrecision, 'auto');
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(committed.afterSettings[key], value);
    assert.equal(committed.afterState[key], value);
  }

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      await root.__v6SettingsSymbolChartSurfaceBridge.ready;
      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      document.querySelector('[data-v6-settings-tab="symbol"]').click();
      return {
        fields: Object.fromEntries(Object.keys(${JSON.stringify(expected)}).map((key) => {
          const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
          return [key, field.type === 'checkbox' ? field.checked : field.value];
        })),
        state: JSON.parse(document.querySelector('[data-v6-chart-surface]').dataset.v6SymbolSettings),
      };
    })()))()
  `));
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(restored.fields[key], value);
    assert.equal(restored.state[key], value);
  }
} finally {
  await page.cleanup();
}

console.log('V6 Settings Symbol browser Step 413 smoke passed.');
