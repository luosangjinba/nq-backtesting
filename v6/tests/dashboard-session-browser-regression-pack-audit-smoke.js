import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createCalendarContract } from '../src/calendar/calendar-contract.js';
import { createJournalContract } from '../src/journal/journal-contract.js';
import { createOrdersContract } from '../src/orders/orders-contract.js';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const PACK = Object.freeze([
  {
    file: 'v6/tests/app-shell-browser-smoke.js',
    tokens: [
      '__v6SessionDashboard?.getState',
      'sessionDashboardMounted',
      'chartEntry.getState',
    ],
  },
  {
    file: 'v6/tests/session-dashboard-browser-smoke.js',
    tokens: [
      'data-v6-dashboard-create-session',
      'data-v6-dashboard-open-session',
      'surface',
      'workstation',
    ],
  },
  {
    file: 'v6/tests/recent-sessions-controls-browser-smoke.js',
    tokens: [
      '[data-v6-row-action]',
      'data-v6-dashboard-search',
      'data-v6-dashboard-sort',
      'data-v6-dashboard-page-next',
      'afterRowActions.snapshot, value.before',
    ],
  },
  {
    file: 'v6/tests/session-summary-surface-browser-smoke.js',
    tokens: [
      '[data-v6-row-action="summary"]',
      'Close session summary',
      'afterOpen.snapshot, value.before',
    ],
  },
  {
    file: 'v6/tests/session-analytics-surface-browser-smoke.js',
    tokens: [
      '[data-v6-row-action="analytics"]',
      'Close session stats',
      'metricFields.length, 10',
      'afterOpen.snapshot, value.before',
    ],
  },
  {
    file: 'v6/tests/session-copy-action-browser-smoke.js',
    tokens: [
      '[data-v6-row-action="copy"]',
      "sessions[1].name, 'Copy source Copy'",
      'after, value.before',
    ],
  },
  {
    file: 'v6/tests/session-metadata-persistence-browser-smoke.js',
    tokens: [
      'Page.reload',
      'localStorage.getItem',
      'chartData.getSummary',
      'barData.getCacheSummary',
      'replay.getState',
    ],
  },
  {
    file: 'v6/tests/session-metadata-delete-browser-smoke.js',
    tokens: [
      'data-v6-dashboard-delete-session',
      'afterInactiveDelete',
      'afterActiveDelete',
      'afterReload',
    ],
  },
  {
    file: 'v6/tests/quick-session-flow-browser-smoke.js',
    tokens: [
      'data-v6-quick-session-open',
      'data-v6-dashboard-create-session',
      'data-v6-asset-option',
      'localStorage.getItem',
    ],
  },
  {
    file: 'v6/tests/product-baseline-screenshot-smoke.js',
    tokens: [
      'Page.captureScreenshot',
      'data-v6-chart-surface',
      'data-v6-transport',
      'data-v6-status-bar',
    ],
  },
]);

const auditDoc = await readFile('v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');

assert.equal(indexDoc.includes('V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md'), true);
assert.match(auditDoc, /Step 109 should audit readiness for exposing the next dashboard row action/);
assert.match(auditDoc, /session metadata persistence across reload/);
assert.match(auditDoc, /session delete behavior for inactive and active sessions/);
assert.match(auditDoc, /quick-session modal flow/);
assert.match(auditDoc, /product baseline screenshot\/layout checks/);

assert.deepEqual(getVisibleRecentSessionRowActions().map((action) => action.id), [
  'summary',
  'analytics',
  'copy',
]);

for (const contract of [
  createOrdersContract(),
  createJournalContract(),
  createCalendarContract(),
]) {
  assert.equal(contract.rowActionVisible, false);
  assert.equal(contract.canLoadBars, false);
  assert.equal(contract.canOpenChart, false);
  assert.equal(contract.canAdvanceReplay, false);
  assert.equal(contract.canTouchViewport, false);
}

for (const { file, tokens } of PACK) {
  await access(file, constants.R_OK);
  const source = await readFile(file, 'utf8');
  for (const token of tokens) {
    assert.equal(source.includes(token), true, `${file} must cover ${token}`);
  }
  for (const forbiddenToken of [
    'ORDER_COMMANDS',
    'JOURNAL_COMMANDS',
    'CALENDAR_COMMANDS',
    'data-v6-row-action="order"',
    'data-v6-row-action="journal"',
    'data-v6-row-action="calendar"',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `${file} must not expose ${forbiddenToken}`);
  }
}

console.log('v6 dashboard session browser regression pack audit smoke passed');
