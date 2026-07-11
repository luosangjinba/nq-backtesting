import assert from 'node:assert/strict';
import {
  auditReplayCoordinationMaterializationOwnership,
  selectReplayCoordinationMaterializationTransitionSlice,
} from '../src/replay/replay-coordination-materialization-transition-selection.js';

const ready = selectReplayCoordinationMaterializationTransitionSlice({
  fastPathRemeasurement: {
    nextSlice: 'replay-coordination-materialization-transition',
    ownerBoundary: 'target-history-fast-path-responsive',
    status: 'materialization-ready',
  },
});
assert.equal(ready.status, 'selected');
assert.equal(ready.selectedSlice, 'replay-coordination-materialization-owner-contract');
assert.equal(ready.ownerBoundary, 'replay-coordination-materialization-transition');
assert.equal(ready.reason, 'materialization-ready-select-owner-contract-before-runtime-change');
assert.equal(ready.ownerAudit.ready, true);
assert.deepEqual(ready.ownerAudit.failed, []);
assert.equal(ready.acceptanceGates.includes('replay-runtime-owns-cursor-and-reveal-state'), true);
assert.equal(ready.acceptanceGates.includes('target-history-request-sizing-unchanged'), true);

const notReady = selectReplayCoordinationMaterializationTransitionSlice({
  fastPathRemeasurement: {
    nextSlice: 'target-history-fast-path-residual-latency-attribution',
    status: 'residual-latency-attribution-needed',
  },
});
assert.equal(notReady.status, 'blocked');
assert.equal(notReady.selectedSlice, null);
assert.equal(notReady.ownerBoundary, 'target-history-fast-path-responsive');
assert.equal(notReady.reason, 'target-history-fast-path-remeasurement-not-ready');

const ownershipBlocked = selectReplayCoordinationMaterializationTransitionSlice({
  fastPathRemeasurement: { status: 'materialization-ready' },
  ownership: {
    chartViewportOwnsIntent: false,
    replaySourceTimeframe: 5,
  },
});
assert.equal(ownershipBlocked.status, 'blocked');
assert.equal(ownershipBlocked.selectedSlice, null);
assert.equal(ownershipBlocked.reason, 'replay-coordination-materialization-ownership-incomplete');
assert.deepEqual(ownershipBlocked.ownerAudit.failed, [
  'chartViewportOwnsIntent',
  'replaySource1mDriven',
]);

const noCandidate = selectReplayCoordinationMaterializationTransitionSlice({
  candidates: ['future-runtime-materialization'],
  fastPathRemeasurement: { status: 'materialization-ready' },
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.selectedSlice, null);
assert.equal(noCandidate.reason, 'no-replay-coordination-materialization-candidate');

const directAudit = auditReplayCoordinationMaterializationOwnership({
  barDataOwnsBars: false,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(directAudit.ready, false);
assert.deepEqual(directAudit.failed, [
  'barDataOwnsBars',
  'targetHistoryRequestSizingUnchanged',
]);

console.log('v6 replay coordination materialization transition selection step328 smoke passed');
