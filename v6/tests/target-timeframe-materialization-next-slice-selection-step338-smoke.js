import assert from 'node:assert/strict';
import {
  auditTargetTimeframeMaterializationNextSliceReadiness,
  selectTargetTimeframeMaterializationNextSlice,
} from '../src/replay/target-timeframe-materialization-next-slice-selection.js';

const completedCoverage = {
  autoPlayCovered: true,
  displayApplyCovered: true,
  fallbackCovered: true,
  manualNextCovered: true,
  packMemberControlsAvailable: true,
  sourceReplayCursorAuthority: true,
  targetBarsDisplayInputOnly: true,
};

const readiness = auditTargetTimeframeMaterializationNextSliceReadiness({
  coverage: completedCoverage,
});
assert.equal(readiness.ready, true);
assert.deepEqual(readiness.failed, []);
assert.equal(readiness.checks.displayApplyCovered, true);
assert.equal(readiness.checks.manualNextCovered, true);
assert.equal(readiness.checks.autoPlayCovered, true);
assert.equal(readiness.checks.fallbackCovered, true);

const selected = selectTargetTimeframeMaterializationNextSlice({
  coverage: completedCoverage,
});
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'target-history-pack-replay-coordination-member');
assert.equal(selected.ownerBoundary, 'target-history-browser-regression-pack');
assert.equal(selected.reason, 'step337-covered-select-pack-member-integration-before-runtime-changes');
assert.deepEqual(selected.affectedRuntimes, ['test-harness.target-history-pack']);
assert.equal(selected.acceptanceGates.includes('full-target-history-pack-remains-available'), true);
assert.equal(selected.acceptanceGates.includes('no-runtime-behavior-change-in-selection-step'), true);
assert.equal(selected.forbiddenActions.includes('route-target-bars-through-replay-runtime'), true);
assert.equal(selected.rollbackCriteria.includes('pack-env-selection-regresses'), true);

const readoutFallback = selectTargetTimeframeMaterializationNextSlice({
  candidates: ['target-materialization-diagnostics-readout'],
  coverage: completedCoverage,
});
assert.equal(readoutFallback.status, 'selected');
assert.equal(readoutFallback.selectedSlice, 'target-materialization-diagnostics-readout');
assert.equal(readoutFallback.ownerBoundary, 'target-materialization-diagnostics');
assert.equal(readoutFallback.reason, 'pack-integration-candidate-missing-select-readout-before-runtime-changes');

const runtimeTooEarly = selectTargetTimeframeMaterializationNextSlice({
  candidates: ['narrow-replay-materialization-runtime-handoff'],
  coverage: completedCoverage,
});
assert.equal(runtimeTooEarly.status, 'blocked');
assert.equal(runtimeTooEarly.selectedSlice, null);
assert.equal(runtimeTooEarly.reason, 'runtime-handoff-deferred-until-pack-integration-or-readout');

const incomplete = selectTargetTimeframeMaterializationNextSlice({
  coverage: {
    ...completedCoverage,
    autoPlayCovered: false,
    packMemberControlsAvailable: false,
    sourceReplayCursorAuthority: false,
  },
});
assert.equal(incomplete.status, 'blocked');
assert.equal(incomplete.reason, 'target-timeframe-materialization-next-slice-readiness-incomplete');
assert.deepEqual(incomplete.readiness.failed, [
  'autoPlayCovered',
  'packMemberControlsAvailable',
  'sourceReplayCursorAuthority',
]);

const changedRuntimeGates = selectTargetTimeframeMaterializationNextSlice({
  chartHistoryFastPathUnchanged: false,
  coverage: completedCoverage,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedRuntimeGates.status, 'blocked');
assert.deepEqual(changedRuntimeGates.readiness.failed, [
  'chartHistoryFastPathUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

const noCandidate = selectTargetTimeframeMaterializationNextSlice({
  candidates: ['unknown-future-slice'],
  coverage: completedCoverage,
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.reason, 'no-target-timeframe-materialization-next-slice-candidate');

console.log('v6 target timeframe materialization next slice selection step338 smoke passed');
