import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCalendarContract } from '../src/calendar/calendar-contract.js';
import { createJournalContract } from '../src/journal/journal-contract.js';
import { createOrdersContract } from '../src/orders/orders-contract.js';
import { createSessionAnalyticsContract } from '../src/session-analytics/session-analytics-contract.js';
import { createSessionCopyContract } from '../src/session/session-copy-contract.js';
import { createSessionSummaryContract } from '../src/session-summary/session-summary-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile('v6/docs/V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const controlsBrowserSmoke = await readFile('v6/tests/recent-sessions-controls-browser-smoke.js', 'utf8');
const dashboardBrowserSmoke = await readFile('v6/tests/session-dashboard-browser-smoke.js', 'utf8');

const actions = getRecentSessionRowActionBoundaries();
const byId = new Map(actions.map((action) => [action.id, action]));

assert.equal(indexDoc.includes('V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md'), true);
assert.match(auditDoc, /Step 107 should audit dashboard browser coverage/);
assert.match(auditDoc, /Summary, Stats, Copy, and Journal are now visible/);
assert.match(auditDoc, /Order and Calendar remain disabled\/hidden/);
assert.match(auditDoc, /Row actions do not directly control chart, bars, replay, viewport/);

assert.deepEqual(actions.map((action) => action.id), [
  'summary',
  'analytics',
  'copy',
  'order',
  'journal',
  'calendar',
]);
assert.deepEqual(getVisibleRecentSessionRowActions().map((action) => action.id), [
  'summary',
  'analytics',
  'copy',
  'journal',
]);

assert.deepEqual(
  ['summary', 'analytics', 'copy', 'journal'].map((id) => ({
    enabled: byId.get(id).enabled,
    id,
    owner: byId.get(id).owner,
    status: byId.get(id).status,
    visible: byId.get(id).visibleInRecentSessions,
  })),
  [
    {
      enabled: true,
      id: 'summary',
      owner: 'session-summary',
      status: 'surface-ready',
      visible: true,
    },
    {
      enabled: true,
      id: 'analytics',
      owner: 'session-analytics',
      status: 'surface-ready',
      visible: true,
    },
    {
      enabled: true,
      id: 'copy',
      owner: 'session-repository',
      status: 'action-ready',
      visible: true,
    },
    {
      enabled: true,
      id: 'journal',
      owner: 'journal-runtime',
      status: 'surface-ready',
      visible: true,
    },
  ],
);

assert.deepEqual(
  ['order', 'calendar'].map((id) => ({
    enabled: byId.get(id).enabled,
    id,
    owner: byId.get(id).owner,
    status: byId.get(id).status,
    visible: byId.get(id).visibleInRecentSessions,
  })),
  [
    {
      enabled: false,
      id: 'order',
      owner: 'orders-runtime',
      status: 'future',
      visible: false,
    },
    {
      enabled: false,
      id: 'calendar',
      owner: 'calendar-runtime',
      status: 'future',
      visible: false,
    },
  ],
);

const summaryContract = createSessionSummaryContract();
const analyticsContract = createSessionAnalyticsContract();
const copyContract = createSessionCopyContract();
for (const contract of [summaryContract, analyticsContract, copyContract]) {
  assert.equal(contract.canLoadBars, false);
  assert.equal(contract.canOpenChart, false);
}
assert.equal(analyticsContract.canAdvanceReplay, false);
assert.equal(analyticsContract.canTouchViewport, false);
assert.equal(copyContract.canAdvanceReplay, false);
assert.equal(copyContract.canTouchViewport, false);

for (const contract of [createOrdersContract(), createCalendarContract()]) {
  assert.equal(contract.rowActionVisible, false);
  assert.equal(contract.canLoadBars, false);
  assert.equal(contract.canOpenChart, false);
  assert.equal(contract.canAdvanceReplay, false);
  assert.equal(contract.canTouchViewport, false);
  assert.equal(contract.blockedIntegrations.includes('session-dashboard'), true);
}
const journalContract = createJournalContract();
assert.equal(journalContract.rowActionVisible, true);
assert.equal(journalContract.canLoadBars, false);
assert.equal(journalContract.canOpenChart, false);
assert.equal(journalContract.canAdvanceReplay, false);
assert.equal(journalContract.canTouchViewport, false);
assert.equal(journalContract.blockedIntegrations.includes('session-dashboard'), true);

assert.equal(controlsBrowserSmoke.includes('[data-v6-row-action]'), true);
assert.equal(controlsBrowserSmoke.includes("id: 'summary', owner: 'session-summary'"), true);
assert.equal(controlsBrowserSmoke.includes("id: 'analytics', owner: 'session-analytics'"), true);
assert.equal(controlsBrowserSmoke.includes("id: 'copy', owner: 'session-repository'"), true);
assert.equal(controlsBrowserSmoke.includes('afterRowActions.snapshot, value.before'), true);
assert.equal(controlsBrowserSmoke.includes('afterSearch.snapshot, value.before'), true);
assert.equal(controlsBrowserSmoke.includes('afterSort.snapshot, value.before'), true);
assert.equal(controlsBrowserSmoke.includes('pageTwo.snapshot, value.before'), true);
assert.equal(controlsBrowserSmoke.includes('barData.getCacheSummary'), true);
assert.equal(controlsBrowserSmoke.includes('chartData.getSummary'), true);
assert.equal(controlsBrowserSmoke.includes('chartEntry.getState'), true);
assert.equal(controlsBrowserSmoke.includes('replay.getState'), true);

for (const forbiddenToken of [
  "data-v6-row-action=\"order\"",
  "data-v6-row-action=\"calendar\"",
  'ORDER_COMMANDS',
  'JOURNAL_COMMANDS',
  'CALENDAR_COMMANDS',
  'BAR_DATA_COMMANDS.LOAD_WINDOW',
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
  'REPLAY_COMMANDS.NEXT',
]) {
  assert.equal(controlsBrowserSmoke.includes(forbiddenToken), false, `row-action browser smoke must not expose ${forbiddenToken}`);
  assert.equal(dashboardBrowserSmoke.includes(forbiddenToken), false, `dashboard browser smoke must not expose ${forbiddenToken}`);
}

console.log('v6 dashboard row action isolation re-audit smoke passed');
