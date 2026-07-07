import assert from 'node:assert/strict';
import {
  createJournalContract,
  getJournalAllowedFields,
  getJournalBlockedIntegrations,
  getJournalOwner,
} from '../src/journal/journal-contract.js';

assert.equal(getJournalOwner(), 'journal-runtime');
assert.deepEqual(getJournalAllowedFields(), [
  'closedAt',
  'createdAt',
  'entryPrice',
  'exitPrice',
  'id',
  'metadata',
  'notes',
  'openedAt',
  'quantity',
  'side',
  'symbol',
  'tags',
  'updatedAt',
]);
assert.deepEqual(getJournalBlockedIntegrations(), [
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'orders',
  'replay',
  'session-dashboard',
  'viewport',
]);

assert.deepEqual(createJournalContract(), {
  allowedFields: getJournalAllowedFields(),
  blockedIntegrations: getJournalBlockedIntegrations(),
  canAdvanceReplay: false,
  canLoadBars: false,
  canOpenChart: false,
  canQueryCalendar: false,
  canReadOrders: false,
  canTouchViewport: false,
  commandSurfaceReady: true,
  owner: 'journal-runtime',
  persistenceReady: true,
  rowActionVisible: true,
  surfaceReady: true,
});
assert.equal(Object.isFrozen(createJournalContract()), true);

console.log('v6 journal contract smoke passed');
