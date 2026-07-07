import assert from 'node:assert/strict';
import {
  createCalendarContract,
  getCalendarAllowedFields,
  getCalendarBlockedIntegrations,
  getCalendarOwner,
} from '../src/calendar/calendar-contract.js';

assert.equal(getCalendarOwner(), 'calendar-runtime');
assert.deepEqual(getCalendarAllowedFields(), [
  'actual',
  'country',
  'createdAt',
  'currency',
  'eventId',
  'forecast',
  'impact',
  'metadata',
  'previous',
  'provider',
  'releaseTime',
  'sessionId',
  'source',
  'title',
  'updatedAt',
]);
assert.deepEqual(getCalendarBlockedIntegrations(), [
  'bar-data',
  'chart-data',
  'chart-engine',
  'chart-viewport',
  'journal',
  'orders',
  'replay',
  'session-dashboard',
  'viewport',
]);

assert.deepEqual(createCalendarContract(), {
  allowedFields: getCalendarAllowedFields(),
  blockedIntegrations: getCalendarBlockedIntegrations(),
  canAdvanceReplay: false,
  canLoadBars: false,
  canMutateJournal: false,
  canOpenChart: false,
  canReadOrders: false,
  canTouchViewport: false,
  commandSurfaceReady: false,
  owner: 'calendar-runtime',
  persistenceReady: false,
  providerReadReady: false,
  rowActionVisible: false,
  writeReady: false,
});
assert.equal(Object.isFrozen(createCalendarContract()), true);

console.log('v6 calendar contract smoke passed');
