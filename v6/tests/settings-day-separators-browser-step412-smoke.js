import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';
const expected = {
  chartDaySeparators: 'both',
  chartIctDaySeparatorColor: '#cc33ff',
  chartIctDaySeparatorStyle: 'solid',
  chartTradingDaySeparatorColor: '#3388ff',
  chartTradingDaySeparatorStyle: 'dotted',
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
      const events = await import('/v6/src/runtime/events.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const surface = document.querySelector('[data-v6-chart-surface]');
      await root.__v6SettingsDaySeparatorBridge.ready;
      const start = Date.parse('2026-03-08T00:00:00Z') / 1000;
      const bars = Array.from({ length: 48 }, (_, index) => ({
        close: 100 + index,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: start + (index * 3600),
      }));
      events.emitEvent(contracts.CHART_DATA_EVENTS.BARS_CHANGED, {
        operation: 'replace',
        record: { bars, paneId: 'main', revision: 1 },
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const beforeCount = Number(surface.dataset.v6ChartDaySeparatorCount || 0);

      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const next = ${JSON.stringify(expected)};
      Object.entries(next).forEach(([key, value]) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        field.value = String(value);
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const draftCount = Number(surface.dataset.v6ChartDaySeparatorCount || 0);
      const draftSettings = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      document.querySelector('[data-v6-settings-ok]').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        afterCount: Number(surface.dataset.v6ChartDaySeparatorCount || 0),
        afterMode: surface.dataset.v6ChartDaySeparators,
        afterSettings: await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT),
        beforeCount,
        draftCount,
        draftSettings,
      };
    })()))()
  `));
  assert.equal(committed.beforeCount, 0);
  assert.equal(committed.draftCount, 0);
  assert.equal(committed.draftSettings.chartDaySeparators, 'off');
  assert.equal(committed.afterMode, 'both');
  assert.equal(committed.afterCount, 4);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(committed.afterSettings[key], value);
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
      await root.__v6SettingsDaySeparatorBridge.ready;
      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return Object.fromEntries(Object.keys(${JSON.stringify(expected)}).map((key) => {
        const field = document.querySelector('[data-v6-settings-field="' + key + '"]');
        return [key, field.value];
      }));
    })()))()
  `));
  assert.deepEqual(restored, expected);
} finally {
  await page.cleanup();
}

console.log('V6 Settings Day Separators browser Step 412 smoke passed.');
