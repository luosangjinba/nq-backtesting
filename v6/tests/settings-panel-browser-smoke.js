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
      const theme = document.querySelector('[data-v6-settings-field="theme"]');
      const timezone = document.querySelector('[data-v6-settings-field="displayTimezone"]');
      const grid = document.querySelector('[data-v6-settings-field="chartGrid"]');

      const before = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);
      toggle.click();
      theme.value = 'light';
      theme.dispatchEvent(new Event('change', { bubbles: true }));
      timezone.value = 'utc';
      timezone.dispatchEvent(new Event('change', { bubbles: true }));
      grid.checked = false;
      grid.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const after = await commands.dispatchCommand(contracts.SETTINGS_COMMANDS.GET_SNAPSHOT);

      return {
        after,
        before,
        commandNames: commands.listCommands(),
        mounted: Boolean(root.__v6SettingsPanel?.getState),
        modalTitle: document.querySelector('.settings-modal-header strong')?.textContent || '',
        tabLabels: [...document.querySelectorAll('.settings-tab-rail button span')].map((element) => element.textContent),
        modalRect: (() => {
          const rect = modal.getBoundingClientRect();
          return { height: Math.round(rect.height), width: Math.round(rect.width) };
        })(),
        open: !panel.hidden,
        toggleExpanded: toggle.getAttribute('aria-expanded'),
        uiState: root.__v6SettingsPanel.getState(),
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.equal(value.open, true);
  assert.equal(value.modalTitle, 'Settings');
  assert.deepEqual(value.tabLabels, ['Symbol', 'Status line', 'Scales and lines', 'Canvas']);
  assert.equal(value.modalRect.width >= 560, true);
  assert.equal(value.modalRect.height >= 520, true);
  assert.equal(value.toggleExpanded, 'true');
  assert.deepEqual(value.before, {
    chartGrid: true,
    displayTimezone: 'exchange',
    showWatermark: true,
    theme: 'dark',
  });
  assert.deepEqual(value.after, {
    chartGrid: false,
    displayTimezone: 'utc',
    showWatermark: true,
    theme: 'light',
  });
  assert.deepEqual(value.uiState.settings, {
    chartGrid: false,
    displayTimezone: 'utc',
    showWatermark: true,
    theme: 'light',
  });
  assert.equal(value.commandNames.includes('settings.update'), true);
  assert.equal(value.commandNames.includes('chartData.replaceBars'), true);
} finally {
  await page.cleanup();
}

console.log('v6 settings panel browser smoke passed');
