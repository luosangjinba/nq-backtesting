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
  'v6/docs/V6_NEXT_DASHBOARD_ROW_ACTION_EXPOSURE_READINESS_AUDIT.md',
  'utf8',
);
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const dashboardPackSmoke = await readFile(
  'v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js',
  'utf8',
);

assert.equal(
  indexDoc.includes('V6_NEXT_DASHBOARD_ROW_ACTION_EXPOSURE_READINESS_AUDIT.md'),
  true,
);
assert.match(auditDoc, /No hidden dashboard row action is ready to expose yet/);
assert.match(auditDoc, /Journal is the nearest candidate/);
assert.match(auditDoc, /owner surface is ready/);
assert.match(auditDoc, /dedicated browser smoke/);
assert.match(auditDoc, /Step 110 should focus on Journal row-action owner surface readiness/);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

const hiddenActions = getRecentSessionRowActionBoundaries()
  .filter((action) => ['order', 'journal', 'calendar'].includes(action.id))
  .map((action) => ({
    enabled: action.enabled,
    id: action.id,
    owner: action.owner,
    status: action.status,
    visible: action.visibleInRecentSessions,
  }));

assert.deepEqual(hiddenActions, [
  {
    enabled: false,
    id: 'order',
    owner: 'orders-runtime',
    status: 'future',
    visible: false,
  },
  {
    enabled: false,
    id: 'journal',
    owner: 'journal-runtime',
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
]);

const order = createOrdersContract();
const journal = createJournalContract();
const calendar = createCalendarContract();

for (const contract of [order, journal, calendar]) {
  assert.equal(contract.rowActionVisible, false);
  assert.equal(contract.canLoadBars, false);
  assert.equal(contract.canOpenChart, false);
  assert.equal(contract.canAdvanceReplay, false);
  assert.equal(contract.canTouchViewport, false);
  assert.equal(contract.blockedIntegrations.includes('session-dashboard'), true);
}

assert.deepEqual(
  {
    commandSurfaceReady: order.commandSurfaceReady,
    persistenceReady: order.persistenceReady,
    writeReady: order.writeReady,
  },
  {
    commandSurfaceReady: false,
    persistenceReady: false,
    writeReady: false,
  },
);
assert.deepEqual(
  {
    commandSurfaceReady: journal.commandSurfaceReady,
    persistenceReady: journal.persistenceReady,
    surfaceReady: journal.surfaceReady,
  },
  {
    commandSurfaceReady: true,
    persistenceReady: true,
    surfaceReady: false,
  },
);
assert.deepEqual(
  {
    commandSurfaceReady: calendar.commandSurfaceReady,
    persistenceReady: calendar.persistenceReady,
    providerReadReady: calendar.providerReadReady,
    writeReady: calendar.writeReady,
  },
  {
    commandSurfaceReady: false,
    persistenceReady: false,
    providerReadReady: false,
    writeReady: false,
  },
);

for (const forbiddenToken of [
  'data-v6-row-action="order"',
  'data-v6-row-action="journal"',
  'data-v6-row-action="calendar"',
]) {
  assert.equal(dashboardPackSmoke.includes(forbiddenToken), true);
}

console.log('v6 next dashboard row action exposure readiness audit smoke passed');
