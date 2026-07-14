import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const toggle = document.querySelector('[data-v6-settings-toggle]');
      const panel = document.querySelector('[data-v6-settings-panel]');
      const modal = document.querySelector('.settings-modal');
      const grid = document.querySelector('[data-v6-settings-field="chartGrid"]');
      const cancel = document.querySelector('[data-v6-settings-close-secondary]');
      const ok = document.querySelector('[data-v6-settings-ok]');
      const chartSurface = document.querySelector('[data-v6-chart-surface]');

      await root.__v6SettingsChartSurfaceBridge.ready;
      const before = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const modalRect = (() => {
        const rect = modal.getBoundingClientRect();
        return { height: Math.round(rect.height), width: Math.round(rect.width) };
      })();
      grid.checked = false;
      grid.dispatchEvent(new Event('change', { bubbles: true }));
      const whileDraft = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      const gridWhileDraft = chartSurface.dataset.v6ChartGrid;
      cancel.click();

      toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const restoredAfterCancel = grid.checked;
      grid.checked = false;
      grid.dispatchEvent(new Event('change', { bubbles: true }));
      ok.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const after = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);

      return {
        after,
        before,
        commandNames: commands.listCommands(),
        gridAfterOk: chartSurface.dataset.v6ChartGrid,
        gridWhileDraft,
        modalTitle: document.querySelector('.settings-modal-header strong')?.textContent || '',
        tabLabels: [...document.querySelectorAll('.settings-tab-rail button span')].map((element) => element.textContent),
        modalRect,
        mounted: Boolean(root.__v6SettingsPanel?.getState),
        open: !panel.hidden,
        restoredAfterCancel,
        toggleExpanded: toggle.getAttribute('aria-expanded'),
        uiState: root.__v6SettingsPanel.getState(),
        whileDraft,
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.equal(value.open, false);
  assert.equal(value.modalTitle, 'Settings');
  assert.deepEqual(value.tabLabels, ['Canvas', 'Symbol']);
  assert.equal(value.modalRect.width >= 560, true);
  assert.equal(value.modalRect.height >= 520, true);
  assert.equal(value.toggleExpanded, 'false');
  assert.equal(value.before.chartGrid, true);
  assert.equal(value.whileDraft.chartGrid, true);
  assert.equal(value.gridWhileDraft, 'true');
  assert.equal(value.restoredAfterCancel, true);
  assert.equal(value.after.chartGrid, false);
  assert.equal(value.gridAfterOk, 'false');
  assert.equal(value.uiState.committedSettings.chartGrid, false);
  assert.equal(value.uiState.settings.chartGrid, false);
  assert.equal(value.commandNames.includes('settings.update'), true);
  assert.equal(value.commandNames.includes('chartData.replaceBars'), true);
} finally {
  await page.cleanup();
}

console.log('v6 settings panel browser smoke passed');
