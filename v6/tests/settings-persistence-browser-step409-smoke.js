import assert from 'node:assert/strict';
import {
  evaluate,
  waitForExpression,
} from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const STORAGE_KEY = 'v6.persistence.records';
const page = await openV6Page({ height: 760, width: 1200 });

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
      const root = document.querySelector('[data-v6-root]');
      const toggle = document.querySelector('[data-v6-settings-toggle]');
      const grid = document.querySelector('[data-v6-settings-field="chartGrid"]');
      const ok = document.querySelector('[data-v6-settings-ok]');
      await root.__v6SettingsChartSurfaceBridge.ready;
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      grid.checked = false;
      grid.dispatchEvent(new Event('change', { bubbles: true }));
      ok.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      return JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
    })()))()
  `));

  const settingsRecord = committed.find((record) => (
    record.collection === 'workspaceSettings' && record.key === 'global'
  ));
  assert.equal(settingsRecord.value.version, 6);
  assert.equal(settingsRecord.value.settings.chartGrid, false);

  await page.client.send('Page.reload', { ignoreCache: true });
  await waitForExpression(
    page.client,
    `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`,
    8_000,
  );

  const restored = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const toggle = document.querySelector('[data-v6-settings-toggle]');
      const grid = document.querySelector('[data-v6-settings-field="chartGrid"]');
      const reset = document.querySelector('[data-v6-settings-reset-draft]');
      const cancel = document.querySelector('[data-v6-settings-close-secondary]');
      await root.__v6SettingsChartSurfaceBridge.ready;
      const snapshot = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      const chartGrid = document.querySelector('[data-v6-chart-surface]').dataset.v6ChartGrid;
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const fieldAfterReload = grid.checked;
      reset.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const resetDraft = grid.checked;
      const whileResetDraft = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      cancel.click();
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        chartGrid,
        fieldAfterCancel: grid.checked,
        fieldAfterReload,
        resetDraft,
        snapshot,
        whileResetDraft,
      };
    })()))()
  `));

  assert.equal(restored.snapshot.chartGrid, false);
  assert.equal(restored.chartGrid, 'false');
  assert.equal(restored.fieldAfterReload, false);
  assert.equal(restored.resetDraft, true);
  assert.equal(restored.whileResetDraft.chartGrid, false);
  assert.equal(restored.fieldAfterCancel, false);
} finally {
  await page.cleanup();
}

console.log('V6 Settings persistence browser Step 409 smoke passed.');
