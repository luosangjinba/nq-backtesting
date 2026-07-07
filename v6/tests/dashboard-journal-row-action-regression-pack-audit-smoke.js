import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCalendarContract } from '../src/calendar/calendar-contract.js';
import { createJournalContract } from '../src/journal/journal-contract.js';
import { createOrdersContract } from '../src/orders/orders-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile(
  'v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md',
  'utf8',
);
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const packDoc = await readFile('v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md', 'utf8');
const packSmoke = await readFile('v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js', 'utf8');
const visibleCoverageSmoke = await readFile(
  'v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js',
  'utf8',
);
const recentSessionsSmoke = await readFile('v6/tests/recent-sessions-controls-browser-smoke.js', 'utf8');
const journalBrowserSmoke = await readFile('v6/tests/session-journal-row-action-browser-smoke.js', 'utf8');

assert.equal(indexDoc.includes('V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md'), true);
assert.match(auditDoc, /Summary, Stats, Copy, and Journal are the visible/);
assert.match(auditDoc, /Order and Calendar remain hidden/);
assert.match(auditDoc, /Step 118 should return to the next workstation\/chart-facing slice/);

assert.match(packDoc, /Copy, and Journal row actions/);
assert.match(packDoc, /Summary, Stats, Copy, and Journal browser behavior/);
assert.match(packDoc, /Order and Calendar remain hidden/);

assert.equal(packSmoke.includes('session-journal-row-action-browser-smoke.js'), true);
assert.equal(packSmoke.includes('[data-v6-row-action="journal"]'), true);
assert.equal(packSmoke.includes('data-v6-row-action="order"'), true);
assert.equal(packSmoke.includes('data-v6-row-action="calendar"'), true);
assert.equal(visibleCoverageSmoke.includes('session-journal-row-action-browser-smoke.js'), true);
assert.equal(recentSessionsSmoke.includes("id: 'journal', owner: 'journal-runtime'"), true);
assert.equal(recentSessionsSmoke.includes('journalRowAction.context.sessionId'), true);
assert.equal(journalBrowserSmoke.includes('afterOpen.snapshot, value.before'), true);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

const byId = new Map(getRecentSessionRowActionBoundaries().map((action) => [action.id, action]));
assert.deepEqual(
  ['order', 'calendar'].map((id) => ({
    enabled: byId.get(id).enabled,
    id,
    owner: byId.get(id).owner,
    visible: byId.get(id).visibleInRecentSessions,
  })),
  [
    {
      enabled: false,
      id: 'order',
      owner: 'orders-runtime',
      visible: false,
    },
    {
      enabled: false,
      id: 'calendar',
      owner: 'calendar-runtime',
      visible: false,
    },
  ],
);

for (const contract of [createOrdersContract(), createCalendarContract()]) {
  assert.equal(contract.rowActionVisible, false);
  assert.equal(contract.canLoadBars, false);
  assert.equal(contract.canOpenChart, false);
  assert.equal(contract.canAdvanceReplay, false);
  assert.equal(contract.canTouchViewport, false);
}

const journalContract = createJournalContract();
assert.equal(journalContract.rowActionVisible, true);
assert.equal(journalContract.canLoadBars, false);
assert.equal(journalContract.canOpenChart, false);
assert.equal(journalContract.canAdvanceReplay, false);
assert.equal(journalContract.canTouchViewport, false);
assert.equal(journalContract.canReadOrders, false);
assert.equal(journalContract.canQueryCalendar, false);

for (const source of [recentSessionsSmoke, journalBrowserSmoke]) {
  for (const forbiddenToken of [
    'ORDER_COMMANDS',
    'CALENDAR_COMMANDS',
    'BAR_DATA_COMMANDS.LOAD_WINDOW',
    'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
    'REPLAY_COMMANDS.NEXT',
    'fetch(',
    'XMLHttpRequest',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `dashboard pack smoke must not use ${forbiddenToken}`);
  }
}

console.log('v6 dashboard journal row action regression pack audit smoke passed');
