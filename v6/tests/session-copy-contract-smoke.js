import assert from 'node:assert/strict';
import {
  createSessionCopyContract,
  getSessionCopyAllowedFields,
  getSessionCopyBlockedFields,
  getSessionCopyOwner,
} from '../src/session/session-copy-contract.js';

assert.equal(getSessionCopyOwner(), 'session-repository');
assert.deepEqual(getSessionCopyAllowedFields(), [
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
]);
assert.deepEqual(getSessionCopyBlockedFields(), [
  'activeReplayState',
  'bars',
  'chartState',
  'id',
  'journalEntries',
  'orders',
  'viewportState',
]);

assert.deepEqual(createSessionCopyContract(), {
  allowedFields: getSessionCopyAllowedFields(),
  blockedFields: getSessionCopyBlockedFields(),
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
assert.equal(Object.isFrozen(createSessionCopyContract()), true);

console.log('v6 session copy contract smoke passed');
