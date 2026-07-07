import assert from 'node:assert/strict';
import { createCalendarContract } from '../src/calendar/calendar-contract.js';
import { createJournalContract } from '../src/journal/journal-contract.js';
import { createOrdersContract } from '../src/orders/orders-contract.js';
import {
  createSessionSummaryContract,
  getSessionSummaryOwner,
} from '../src/session-summary/session-summary-contract.js';
import {
  createSessionAnalyticsContract,
  getSessionAnalyticsOwner,
} from '../src/session-analytics/session-analytics-contract.js';
import {
  createSessionCopyContract,
  getSessionCopyOwner,
} from '../src/session/session-copy-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const actions = getRecentSessionRowActionBoundaries();
const byId = new Map(actions.map((action) => [action.id, action]));

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
]);

assert.deepEqual(
  ['summary', 'analytics', 'copy'].map((id) => ({
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
      owner: getSessionSummaryOwner(),
      status: 'surface-ready',
      visible: true,
    },
    {
      enabled: true,
      id: 'analytics',
      owner: getSessionAnalyticsOwner(),
      status: 'surface-ready',
      visible: true,
    },
    {
      enabled: true,
      id: 'copy',
      owner: getSessionCopyOwner(),
      status: 'action-ready',
      visible: true,
    },
  ],
);

assert.deepEqual(
  ['order', 'journal', 'calendar'].map((id) => ({
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
  ],
);

assert.deepEqual(createSessionSummaryContract(), {
  allowedFields: [
    'accountBalance',
    'autoUpdateEndDate',
    'createdAt',
    'durationDays',
    'endTime',
    'id',
    'name',
    'profileId',
    'startTime',
    'status',
    'symbol',
    'symbols',
    'timeframe',
    'workspaceId',
  ],
  canLoadBars: false,
  canOpenChart: false,
  canMutateSession: false,
  canReadOrders: false,
  canReadJournal: false,
  canReadCalendar: false,
  owner: 'session-summary',
});

assert.equal(createSessionAnalyticsContract().owner, 'session-analytics');
assert.equal(createSessionAnalyticsContract().canLoadBars, false);
assert.equal(createSessionAnalyticsContract().canOpenChart, false);
assert.equal(createSessionAnalyticsContract().canAdvanceReplay, false);
assert.equal(createSessionCopyContract().owner, 'session-repository');
assert.equal(createSessionCopyContract().canLoadBars, false);
assert.equal(createSessionCopyContract().canOpenChart, false);
assert.equal(createSessionCopyContract().canAdvanceReplay, false);
assert.equal(createOrdersContract().owner, 'orders-runtime');
assert.equal(createOrdersContract().rowActionVisible, false);
assert.equal(createOrdersContract().commandSurfaceReady, false);
assert.equal(createJournalContract().owner, 'journal-runtime');
assert.equal(createJournalContract().rowActionVisible, false);
assert.equal(createJournalContract().surfaceReady, false);
assert.equal(createCalendarContract().owner, 'calendar-runtime');
assert.equal(createCalendarContract().rowActionVisible, false);
assert.equal(createCalendarContract().providerReadReady, false);

console.log('v6 recent sessions row action contract audit smoke passed');
