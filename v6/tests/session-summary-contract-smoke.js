import assert from 'node:assert/strict';
import {
  createSessionSummary,
  createSessionSummaryContract,
  getSessionSummaryAllowedFields,
  getSessionSummaryOwner,
} from '../src/session-summary/session-summary-contract.js';

assert.equal(getSessionSummaryOwner(), 'session-summary');
assert.deepEqual(getSessionSummaryAllowedFields(), [
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

assert.deepEqual(createSessionSummaryContract(), {
  allowedFields: getSessionSummaryAllowedFields(),
  canLoadBars: false,
  canOpenChart: false,
  canMutateSession: false,
  canReadOrders: false,
  canReadJournal: false,
  canReadCalendar: false,
  owner: 'session-summary',
});

const summary = createSessionSummary({
  accountBalance: '250000',
  autoUpdateEndDate: true,
  createdAt: '2026-07-04T00:00:00.000Z',
  endTime: '2026-06-05T20:00:00.000Z',
  id: 'summary-test',
  name: 'NY AM',
  profileId: 'profile-a',
  startTime: '2026-06-01T13:30:00.000Z',
  status: 'created',
  symbol: 'es',
  symbols: ['es', 'nq', 'ES'],
  timeframe: '1m',
  workspaceId: 'workspace-a',
});

assert.deepEqual(summary, {
  accountBalance: 250000,
  autoUpdateEndDate: true,
  createdAt: '2026-07-04T00:00:00.000Z',
  durationDays: 5,
  endTime: '2026-06-05T20:00:00.000Z',
  id: 'summary-test',
  name: 'NY AM',
  profileId: 'profile-a',
  startTime: '2026-06-01T13:30:00.000Z',
  status: 'created',
  symbol: 'ES',
  symbols: ['ES', 'NQ'],
  timeframe: '1m',
  workspaceId: 'workspace-a',
});
assert.equal(Object.isFrozen(summary), true);

assert.deepEqual(createSessionSummary({ id: 'empty' }), {
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
});

console.log('v6 session summary contract smoke passed');
