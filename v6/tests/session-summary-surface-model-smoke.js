import assert from 'node:assert/strict';
import { createSessionSummarySurfaceView } from '../src/session-summary/session-summary-surface-model.js';

const view = createSessionSummarySurfaceView({
  accountBalance: 100000,
  autoUpdateEndDate: false,
  createdAt: '2026-07-06T10:00:00.000Z',
  endTime: '2026-07-05T20:00:00.000Z',
  id: 'summary-row',
  name: 'NY AM',
  profileId: 'default-profile',
  startTime: '2026-07-01T13:30:00.000Z',
  status: 'created',
  symbols: ['ES', 'NQ'],
  timeframe: '1m',
  workspaceId: 'default-workspace',
});

assert.equal(view.owner, 'session-summary');
assert.equal(view.sessionId, 'summary-row');
assert.equal(view.title, 'NY AM');
assert.equal(view.fields.length, 14);
assert.deepEqual(view.fields.map((field) => field.field), [
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
  view.fields.filter((field) => ['accountBalance', 'durationDays', 'symbols'].includes(field.field)),
  [
    { field: 'accountBalance', label: 'Account Balance', value: '$100,000' },
    { field: 'durationDays', label: 'Duration', value: '5 days' },
    { field: 'symbols', label: 'Symbols', value: 'ES, NQ' },
  ],
);
assert.equal(Object.isFrozen(view), true);
assert.equal(Object.isFrozen(view.fields), true);

console.log('v6 session summary surface model smoke passed');
