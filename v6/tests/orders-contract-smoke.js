import assert from 'node:assert/strict';
import {
  createOrdersContract,
  getOrdersAllowedFields,
  getOrdersBlockedIntegrations,
  getOrdersOwner,
} from '../src/orders/orders-contract.js';

assert.equal(getOrdersOwner(), 'orders-runtime');
assert.deepEqual(getOrdersAllowedFields(), [
  'accountId',
  'averagePrice',
  'closedAt',
  'commission',
  'createdAt',
  'direction',
  'entryPrice',
  'exitPrice',
  'fees',
  'id',
  'instrument',
  'metadata',
  'openedAt',
  'profitLoss',
  'quantity',
  'sessionId',
  'source',
  'status',
  'strategy',
  'tags',
  'timeframe',
  'type',
]);
assert.deepEqual(getOrdersBlockedIntegrations(), [
  'bar-data',
  'calendar',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'journal',
  'replay',
  'session-dashboard',
  'viewport',
]);

assert.deepEqual(createOrdersContract(), {
  allowedFields: getOrdersAllowedFields(),
  blockedIntegrations: getOrdersBlockedIntegrations(),
  canAdvanceReplay: false,
  canLoadBars: false,
  canMutateJournal: false,
  canOpenChart: false,
  canQueryCalendar: false,
  canReadSessionMetadata: false,
  canTouchViewport: false,
  commandSurfaceReady: false,
  owner: 'orders-runtime',
  persistenceReady: false,
  rowActionVisible: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createOrdersContract()), true);

console.log('v6 orders contract smoke passed');
