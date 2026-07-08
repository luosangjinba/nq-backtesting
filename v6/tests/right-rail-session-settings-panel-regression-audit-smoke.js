import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const auditDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const reservationDoc = await readFile('v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const panelSource = shellSource.slice(
  shellSource.indexOf('data-v6-session-settings-details'),
  shellSource.indexOf('</details>', shellSource.indexOf('data-v6-session-settings-details')),
);

assert.equal(indexDoc.includes('V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md'), true);
assert.match(auditDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(auditDoc, /dashboard visible row actions remain Summary, Stats, Copy, and Journal/);
assert.match(reservationDoc, /Chart Settings and Session settings remain distinct surfaces/);
assert.match(selectionDoc, /Right Rail Session Settings\s+Panel Reservation/);
assert.match(guardrailsDoc, /Chart settings and Session settings must remain distinct surfaces/);

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

async function inspectPanel({ height, label, width }) {
  const page = await openV6Page({ height, width });
  try {
    return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        localStorage.removeItem('v6.sessions.metadata');
        document.querySelector('[data-v6-session-setup-name]').value = '${label}';
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
        const before = {
          bottom: rectOf('[data-v6-bottom-account-chrome]'),
          chart: rectOf('[data-v6-chart-surface]'),
          host: rectOf('[data-v6-chart-engine-host]'),
          statusBar: rectOf('[data-v6-status-bar]'),
          transport: rectOf('[data-v6-transport]'),
        };
        trigger.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const panel = document.querySelector('[data-v6-session-settings-panel]');
        return {
          after: {
            bottom: rectOf('[data-v6-bottom-account-chrome]'),
            chart: rectOf('[data-v6-chart-surface]'),
            host: rectOf('[data-v6-chart-engine-host]'),
            statusBar: rectOf('[data-v6-status-bar]'),
            transport: rectOf('[data-v6-transport]'),
          },
          before,
          chartSettingsOpen: Boolean(document.querySelector('[data-v6-settings-modal]:not([hidden])')),
          detailsOpen: details.open,
          disabledControls: [...panel.querySelectorAll('input, select, button')].map((control) => control.disabled),
          fieldsetLabels: [...panel.querySelectorAll('legend')].map((legend) => legend.textContent.trim()),
          panel: rectOf('[data-v6-session-settings-panel]'),
          rightRail: rectOf('[data-v6-right-utility-rail]'),
          triggerLabel: trigger.getAttribute('aria-label') || '',
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      })()))()
    `));
  } finally {
    await page.cleanup();
  }
}

for (const value of [
  await inspectPanel({ height: 860, label: 'Session settings audit desktop', width: 1440 }),
  await inspectPanel({ height: 760, label: 'Session settings audit compact', width: 920 }),
]) {
  assert.equal(value.detailsOpen, true);
  assert.equal(value.triggerLabel, 'Session settings');
  assert.equal(value.chartSettingsOpen, false);
  assert.deepEqual(value.fieldsetLabels, [
    'Session Info',
    'Balance & Assets',
    'Spreads & Commissions',
    'Date Range',
  ]);
  assert.deepEqual(value.disabledControls, [true, true, true, true, true, true, true, true, true, true]);
  assert.equal(value.panel.right <= value.rightRail.left + 1, true);
  assert.equal(value.panel.left >= 0, true);
  assert.equal(value.panel.width > 0, true);
  assert.equal(value.panel.height > 0, true);
  assert.equal(value.panel.bottom <= value.viewportHeight, true);
  assert.deepEqual(value.before.chart, value.after.chart);
  assert.deepEqual(value.before.host, value.after.host);
  assert.deepEqual(value.before.bottom, value.after.bottom);
  assert.deepEqual(value.before.transport, value.after.transport);
  assert.deepEqual(value.before.statusBar, value.after.statusBar);
}

console.log('v6 right rail session settings panel regression audit smoke passed');
