import assert from 'node:assert/strict';
import { createSessionAnalyticsSurfaceView } from '../src/session-analytics/session-analytics-surface-model.js';

const view = createSessionAnalyticsSurfaceView({
  accountBalance: 75000,
  autoUpdateEndDate: true,
  createdAt: '2026-07-07T10:00:00.000Z',
  endTime: '2026-07-05T20:00:00.000Z',
  id: 'analytics-row',
  name: 'NY PM',
  profileId: 'default-profile',
  startTime: '2026-07-01T13:30:00.000Z',
  status: 'created',
  symbols: ['NQ', 'ES'],
  timeframe: '5m',
  workspaceId: 'default-workspace',
});

assert.equal(view.owner, 'session-analytics');
assert.equal(view.sessionId, 'analytics-row');
assert.equal(view.title, 'NY PM Stats');
assert.deepEqual(view.metadataFields.map((field) => field.field), [
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
assert.deepEqual(
  view.metadataFields.filter((field) => ['accountBalance', 'autoUpdateEndDate', 'durationDays', 'symbols'].includes(field.field)),
  [
    { field: 'accountBalance', label: 'Account Balance', value: '$75,000' },
    { field: 'autoUpdateEndDate', label: 'Auto-update End Date', value: 'On' },
    { field: 'durationDays', label: 'Duration', value: '5 days' },
    { field: 'symbols', label: 'Symbols', value: 'NQ, ES' },
  ],
);
assert.deepEqual(view.metricFields, [
  { field: 'averageRMultiple', label: 'Average R', status: 'unavailable', value: '--' },
  { field: 'expectancy', label: 'Expectancy', status: 'unavailable', value: '--' },
  { field: 'grossLoss', label: 'Gross Loss', status: 'unavailable', value: '--' },
  { field: 'grossProfit', label: 'Gross Profit', status: 'unavailable', value: '--' },
  { field: 'lossCount', label: 'Losses', status: 'unavailable', value: '--' },
  { field: 'maxDrawdown', label: 'Max Drawdown', status: 'unavailable', value: '--' },
  { field: 'netProfit', label: 'Net Profit', status: 'unavailable', value: '--' },
  { field: 'tradeCount', label: 'Trades', status: 'unavailable', value: '--' },
  { field: 'winCount', label: 'Wins', status: 'unavailable', value: '--' },
  { field: 'winRate', label: 'Win Rate', status: 'unavailable', value: '--' },
]);
assert.equal(Object.isFrozen(view), true);
assert.equal(Object.isFrozen(view.metadataFields), true);
assert.equal(Object.isFrozen(view.metricFields), true);

console.log('v6 session analytics surface model smoke passed');
