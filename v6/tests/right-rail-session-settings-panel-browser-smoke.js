import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const panelSource = shellSource.slice(
  shellSource.indexOf('data-v6-session-settings-details'),
  shellSource.indexOf('</details>', shellSource.indexOf('data-v6-session-settings-details')),
);

assert.match(selectionDoc, /Right Rail Session Settings\s+Panel Reservation/);
assert.match(guardrailsDoc, /Chart settings and Session settings must remain distinct surfaces/);
assert.equal(panelSource.includes('data-v6-session-settings-panel'), true);

for (const forbiddenToken of [
  'SESSION_SETTINGS_COMMANDS',
  'ORDERS_COMMANDS',
  'CALENDAR_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'BAR_DATA_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'dispatch',
  'localStorage.setItem',
]) {
  assert.equal(panelSource.includes(forbiddenToken), false, `session settings panel must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Session settings panel';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T10:30';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      while (document.querySelector('[data-v6-root]')?.dataset.v6Surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      const details = document.querySelector('[data-v6-session-settings-details]');
      const trigger = document.querySelector('[data-v6-rail-session-settings]');
      const beforeChart = rectOf('[data-v6-chart-surface]');
      const beforeHost = rectOf('[data-v6-chart-engine-host]');
      const beforeBottom = rectOf('[data-v6-bottom-account-chrome]');
      trigger.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const panel = document.querySelector('[data-v6-session-settings-panel]');
      return {
        afterBottom: rectOf('[data-v6-bottom-account-chrome]'),
        afterChart: rectOf('[data-v6-chart-surface]'),
        afterHost: rectOf('[data-v6-chart-engine-host]'),
        beforeBottom,
        beforeChart,
        beforeHost,
        bottom: rectOf('[data-v6-bottom-account-chrome]'),
        detailsOpen: details.open,
        disabledControls: [...panel.querySelectorAll('input, select, button')].map((control) => control.disabled),
        fieldsetLabels: [...panel.querySelectorAll('legend')].map((legend) => legend.textContent.trim()),
        panel: rectOf('[data-v6-session-settings-panel]'),
        rightRail: rectOf('[data-v6-right-utility-rail]'),
        settingsModalExists: Boolean(document.querySelector('[data-v6-settings-modal]:not([hidden])')),
        statusBar: rectOf('[data-v6-status-bar]'),
        transport: rectOf('[data-v6-transport]'),
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.equal(value.detailsOpen, true);
  assert.deepEqual(value.fieldsetLabels, [
    'Session Info',
    'Balance & Assets',
    'Spreads & Commissions',
    'Date Range',
  ]);
  assert.deepEqual(value.disabledControls, [true, true, true, true, true, true, true, true, true, true]);
  assert.equal(value.settingsModalExists, false);
  assert.equal(value.panel.right <= value.rightRail.left + 1, true);
  assert.equal(value.panel.left >= 0, true);
  assert.equal(value.panel.bottom <= value.bottom.top || value.panel.bottom <= value.statusBar.top, true);
  assert.equal(value.transport.bottom <= value.bottom.top, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
  assert.deepEqual(value.beforeChart, value.afterChart);
  assert.deepEqual(value.beforeHost, value.afterHost);
  assert.deepEqual(value.beforeBottom, value.afterBottom);
} finally {
  await page.cleanup();
}

console.log('v6 right rail session settings panel browser smoke passed');
