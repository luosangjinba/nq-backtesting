import assert from 'node:assert/strict';
import {
  createEmptySessionAnalyticsMetrics,
  createSessionAnalyticsContract,
  createSessionAnalyticsSnapshot,
  getSessionAnalyticsAllowedFields,
  getSessionAnalyticsOwner,
} from '../src/session-analytics/session-analytics-contract.js';

assert.equal(getSessionAnalyticsOwner(), 'session-analytics');
assert.deepEqual(getSessionAnalyticsAllowedFields(), [
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
]);

assert.deepEqual(createEmptySessionAnalyticsMetrics(), {
  averageRMultiple: null,
  expectancy: null,
  grossLoss: null,
  grossProfit: null,
  lossCount: null,
  maxDrawdown: null,
  netProfit: null,
  tradeCount: null,
  winCount: null,
  winRate: null,
});

assert.deepEqual(createSessionAnalyticsContract(), {
  allowedFields: getSessionAnalyticsAllowedFields(),
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

const snapshot = createSessionAnalyticsSnapshot({
  accountBalance: '50000',
  autoUpdateEndDate: true,
  createdAt: '2026-07-06T12:00:00.000Z',
  endTime: '2026-06-05T20:00:00.000Z',
  id: 'analytics-test',
  name: 'London AM',
  profileId: 'profile-b',
  startTime: '2026-06-01T13:30:00.000Z',
  status: 'created',
  symbols: ['nq', 'es', 'NQ'],
  timeframe: '5m',
  workspaceId: 'workspace-b',
});

assert.deepEqual(snapshot, {
  metadata: {
    accountBalance: 50000,
    autoUpdateEndDate: true,
    createdAt: '2026-07-06T12:00:00.000Z',
    durationDays: 5,
    endTime: '2026-06-05T20:00:00.000Z',
    id: 'analytics-test',
    name: 'London AM',
    profileId: 'profile-b',
    startTime: '2026-06-01T13:30:00.000Z',
    status: 'created',
    symbol: 'NQ',
    symbols: ['NQ', 'ES'],
    timeframe: '5m',
    workspaceId: 'workspace-b',
  },
  metrics: createEmptySessionAnalyticsMetrics(),
  owner: 'session-analytics',
});
assert.equal(Object.isFrozen(snapshot), true);
assert.equal(Object.isFrozen(snapshot.metadata), true);
assert.equal(Object.isFrozen(snapshot.metrics), true);

assert.deepEqual(createSessionAnalyticsSnapshot({ id: 'empty' }), {
  metadata: {
    accountBalance: 0,
    autoUpdateEndDate: false,
    createdAt: null,
    durationDays: null,
    endTime: null,
    id: 'empty',
    name: 'Untitled session',
    profileId: null,
    startTime: null,
    status: 'unknown',
    symbol: null,
    symbols: [],
    timeframe: null,
    workspaceId: null,
  },
  metrics: createEmptySessionAnalyticsMetrics(),
  owner: 'session-analytics',
});

console.log('v6 session analytics contract smoke passed');
