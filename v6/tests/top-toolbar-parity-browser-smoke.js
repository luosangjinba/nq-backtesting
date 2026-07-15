import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const textOf = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
      const disabled = (selector) => document.querySelector(selector)?.disabled === true;
      const exists = (selector) => Boolean(document.querySelector(selector));
      const headerRect = document.querySelector('[data-v6-workstation-header]').getBoundingClientRect();
      const layoutDetails = document.querySelector('[data-v6-layout-menu-details]');
      document.querySelector('[data-v6-top-page-layout]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        backLabel: document.querySelector('[data-v6-top-back]')?.getAttribute('aria-label') || '',
        backDisabled: disabled('[data-v6-top-back]'),
        editorExists: exists('[data-v6-top-editor]'),
        forwardExists: exists('[data-v6-top-session-forward]'),
        goToExists: exists('[data-v6-rail-goto]'),
        hasHeader: exists('[data-v6-workstation-header]'),
        headerHeight: Math.round(headerRect.height),
        interval: textOf('[data-v6-top-interval]'),
        intervalDisabled: disabled('[data-v6-top-interval]'),
        intervalExpanded: document.querySelector('[data-v6-top-interval]')?.getAttribute('aria-expanded'),
        layoutLabel: document.querySelector('[data-v6-top-page-layout]')?.getAttribute('aria-label') || '',
        layoutDisabled: disabled('[data-v6-top-page-layout]'),
        layoutMenuOpen: layoutDetails.open,
        layoutRows: [...document.querySelectorAll('.layout-menu-row')].map((row) => row.getAttribute('aria-label')),
        layoutOptions: document.querySelectorAll('.layout-option').length,
        layoutOptionDisabled: [...document.querySelectorAll('.layout-option')].map((button) => button.disabled),
        layoutSyncLabels: [...document.querySelectorAll('.layout-sync-section label > span')].map((element) => element.childNodes[0].textContent.trim()),
        layoutSyncDisabled: [...document.querySelectorAll('.layout-sync-section input')].map((input) => input.disabled),
        layoutSyncChecked: [...document.querySelectorAll('.layout-sync-section input')].map((input) => input.checked),
        layoutSyncTitles: [...document.querySelectorAll('.layout-sync-section label')].map((label) => label.title),
        profile: textOf('[data-v6-top-profile]'),
        rightIconCount: document.querySelectorAll('.top-tool-group-right .tool-button .tool-icon').length,
        readinessInHeader: exists('[data-v6-workstation-header] [data-v6-readiness-surface]'),
        sessionDashboardToggleExists: exists('[data-v6-dashboard-toggle]'),
        sessionsWorkflowStillPresent: exists('[data-v6-sessions-toggle]'),
        symbol: textOf('[data-v6-top-symbol]'),
        toolIconCount: document.querySelectorAll('[data-v6-workstation-header] .tool-button .tool-icon').length,
        settingsExists: exists('[data-v6-settings-toggle]'),
      };
    })()))()
  `));

  assert.equal(value.hasHeader, true);
  assert.equal(value.headerHeight <= 56, true);
  assert.equal(value.backLabel, 'Back to session dashboard');
  assert.equal(value.forwardExists, false);
  assert.equal(value.goToExists, true);
  assert.equal(value.symbol, 'NQ');
  assert.equal(value.interval, '1m');
  assert.equal(value.intervalDisabled, false);
  assert.equal(value.intervalExpanded, 'false');
  assert.equal(value.layoutLabel, 'Page layout');
  assert.equal(value.profile, 'test');
  assert.equal(value.layoutMenuOpen, true);
  assert.deepEqual(value.layoutRows, ['One pane', 'Two panes', 'Three panes']);
  assert.equal(value.layoutOptions, 7);
  assert.deepEqual(value.layoutOptionDisabled, [false, false, false, false, false, false, false]);
  assert.deepEqual(value.layoutSyncLabels, ['Symbol', 'Interval', 'Crosshair', 'Time', 'Date range']);
  assert.deepEqual(value.layoutSyncDisabled, [false, false, false, false, false]);
  assert.deepEqual(value.layoutSyncChecked, [false, false, false, false, false]);
  assert.deepEqual(value.layoutSyncTitles, [
    'Symbol changes on all charts within the layout',
    'Interval changes on all charts within the layout',
    'Crosshair is synced across all charts within the layout',
    'When a chart is clicked, all charts within the layout display the same point of time',
    'Date range changes on all charts within the layout',
  ]);
  assert.equal(value.editorExists, false);
  assert.equal(value.sessionDashboardToggleExists, true);
  assert.equal(value.sessionsWorkflowStillPresent, false);
  assert.equal(value.readinessInHeader, true);
  assert.equal(value.toolIconCount >= 3, true);
  assert.equal(value.rightIconCount, 3);
  assert.equal(value.settingsExists, true);
} finally {
  await page.cleanup();
}

console.log('v6 top toolbar parity browser smoke passed');
