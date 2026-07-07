import assert from 'node:assert/strict';
import { createSessionAnalyticsContract } from '../src/session-analytics/session-analytics-contract.js';
import { createSessionCopyContract } from '../src/session/session-copy-contract.js';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const actions = getRecentSessionRowActionBoundaries();
const byId = new Map(actions.map((action) => [action.id, action]));

assert.deepEqual(
  actions.map((action) => action.id),
  ['summary', 'analytics', 'copy', 'order', 'journal', 'calendar'],
);

for (const action of actions) {
  assert.equal(typeof action.enabled, 'boolean');
  assert.equal(typeof action.owner, 'string');
  assert.ok(action.owner.length > 0, `${action.id} needs an owner boundary`);
  assert.equal(typeof action.reason, 'string');
  assert.ok(action.reason.length > 0, `${action.id} needs a boundary reason`);
}

assert.equal(byId.get('summary').owner, 'session-summary');
assert.equal(byId.get('summary').enabled, true);
assert.equal(byId.get('summary').status, 'surface-ready');
assert.match(byId.get('summary').reason, /read-only metadata/i);
assert.equal(byId.get('analytics').owner, 'session-analytics');
assert.equal(byId.get('analytics').enabled, true);
assert.equal(byId.get('analytics').status, 'surface-ready');
assert.match(byId.get('analytics').reason, /read-only metadata/i);
assert.equal(byId.get('copy').owner, 'session-repository');
assert.equal(byId.get('copy').enabled, true);
assert.equal(byId.get('copy').status, 'action-ready');
assert.match(byId.get('copy').reason, /metadata/i);
assert.equal(byId.get('order').owner, 'orders-runtime');
assert.equal(byId.get('order').enabled, false);
assert.equal(byId.get('journal').owner, 'journal-runtime');
assert.equal(byId.get('journal').enabled, false);
assert.equal(byId.get('calendar').owner, 'calendar-runtime');
assert.equal(byId.get('calendar').enabled, false);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

assert.deepEqual(createSessionAnalyticsContract(), {
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
  canAdvanceReplay: false,
  canLoadBars: false,
  canMutateSession: false,
  canOpenChart: false,
  canReadCalendar: false,
  canReadJournal: false,
  canReadOrders: false,
  canTouchViewport: false,
  metricPlaceholders: [
    'averageRMultiple',
    'expectancy',
    'grossLoss',
    'grossProfit',
    'lossCount',
    'maxDrawdown',
    'netProfit',
    'tradeCount',
    'winCount',
    'winRate',
  ],
  owner: 'session-analytics',
});

assert.deepEqual(createSessionCopyContract(), {
  allowedFields: [
    'accountBalance',
    'autoUpdateEndDate',
    'createdAt',
    'endTime',
    'name',
    'profileId',
    'startTime',
    'status',
    'symbol',
    'symbols',
    'timeframe',
    'workspaceId',
  ],
  blockedFields: [
    'activeReplayState',
    'bars',
    'chartState',
    'id',
    'journalEntries',
    'orders',
    'viewportState',
  ],
  canAdvanceReplay: false,
  canCopyBars: false,
  canCopyCalendar: false,
  canCopyChartState: false,
  canCopyJournal: false,
  canCopyOrders: false,
  canCreateMetadataRecord: true,
  canLoadBars: false,
  canOpenChart: false,
  canTouchViewport: false,
  idPolicy: 'new-session-id-required',
  namePolicy: 'append-copy-suffix',
  owner: 'session-repository',
});

console.log('v6 session row action boundaries smoke passed');
