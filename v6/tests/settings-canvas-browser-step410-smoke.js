import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';
const expected = {
  chartAxisBorderColor: '#abcdef',
  chartBackgroundColor: '#010203',
  chartCrosshairColor: '#112233',
  chartGrid: false,
  chartGridColor: '#223344',
  chartScaleFontSize: 16,
  chartScaleTextColor: '#ddeeff',
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
      await root.__v6SettingsChartSurfaceBridge.ready;
      const beforeState = JSON.parse(surface.dataset.v6CanvasSettings);
      const beforeSnapshot = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);

      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const next = ${JSON.stringify(expected)};
      Object.entries(next).forEach(([key, value]) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        if (field.type === 'checkbox') field.checked = value;
        else field.value = String(value);
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const whileDraftState = JSON.parse(surface.dataset.v6CanvasSettings);
      const whileDraftSnapshot = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 30));

      return {
        afterState: JSON.parse(surface.dataset.v6CanvasSettings),
        afterSnapshot: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        beforeState,
        beforeSnapshot,
        records: JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})),
        whileDraftState,
        whileDraftSnapshot,
      };
    })()))()
  `));

  assert.deepEqual(committed.whileDraftState, committed.beforeState);
  assert.deepEqual(committed.whileDraftSnapshot, committed.beforeSnapshot);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(committed.afterState[key], value);
    assert.equal(committed.afterSnapshot[key], value);
  }
  const record = committed.records.find((item) => (
    item.collection === 'workspaceSettings' && item.key === 'global'
  ));
  assert.equal(record.value.version, 6);

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );
  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      await root.__v6SettingsChartSurfaceBridge.ready;
      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const fields = Object.fromEntries([...document.querySelectorAll('[data-v6-settings-field]')]
        .map((field) => [field.dataset.v6SettingsField, field.type === 'checkbox' ? field.checked : field.value]));
      return {
        fields,
        state: JSON.parse(document.querySelector('[data-v6-chart-surface]').dataset.v6CanvasSettings),
      };
    })()))()
  `));
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(restored.state[key], value);
    assert.equal(restored.fields[key], typeof value === 'number' ? String(value) : value);
  }
} finally {
  await page.cleanup();
}

console.log('V6 Settings Canvas browser Step 410 smoke passed.');
