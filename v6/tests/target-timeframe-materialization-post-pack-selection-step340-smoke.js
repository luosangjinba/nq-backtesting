import assert from 'node:assert/strict';
import {
  auditTargetTimeframeMaterializationPostPackReadiness,
  selectTargetTimeframeMaterializationPostPackSlice,
} from '../src/replay/target-timeframe-materialization-post-pack-selection.js';

const completedCoverage = {
  displayMaterializationCovered: true,
  fullEightMemberPackPreserved: true,
  packMemberRunnable: true,
  replayCoordinationBrowserCovered: true,
  replayCoordinationPackMemberAvailable: true,
  sourceReplayCursorAuthority: true,
  targetBarsDisplayInputOnly: true,
};

const readiness = auditTargetTimeframeMaterializationPostPackReadiness({
  coverage: completedCoverage,
});
assert.equal(readiness.ready, true);
assert.deepEqual(readiness.failed, []);
assert.equal(readiness.checks.replayCoordinationPackMemberAvailable, true);
assert.equal(readiness.checks.fullEightMemberPackPreserved, true);

const selected = selectTargetTimeframeMaterializationPostPackSlice({
  coverage: completedCoverage,
});
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'target-materialization-replay-coordination-diagnostics-readout');
assert.equal(selected.ownerBoundary, 'target-materialization-diagnostics-readout');
assert.equal(selected.reason, 'pack-member-runnable-select-diagnostics-readout-before-runtime-handoff');
assert.deepEqual(selected.affectedRuntimes, ['shell.diagnostics-readout', 'runtime.display-timeframe']);
assert.equal(selected.acceptanceGates.includes('replay-coordination-pack-member-available'), true);
assert.equal(selected.acceptanceGates.includes('full-eight-member-target-history-pack-preserved'), true);
assert.equal(selected.forbiddenActions.includes('route-target-bars-through-replay-runtime'), true);
assert.equal(selected.rollbackCriteria.includes('replay-coordination-pack-member-fails'), true);

const runtimeTooEarly = selectTargetTimeframeMaterializationPostPackSlice({
  candidates: ['narrow-replay-materialization-runtime-handoff'],
  coverage: completedCoverage,
});
assert.equal(runtimeTooEarly.status, 'blocked');
assert.equal(runtimeTooEarly.selectedSlice, null);
assert.equal(runtimeTooEarly.reason, 'runtime-handoff-deferred-until-diagnostics-readout-selection');

const incomplete = selectTargetTimeframeMaterializationPostPackSlice({
  coverage: {
    ...completedCoverage,
    fullEightMemberPackPreserved: false,
    packMemberRunnable: false,
    sourceReplayCursorAuthority: false,
  },
});
assert.equal(incomplete.status, 'blocked');
assert.equal(incomplete.reason, 'target-timeframe-materialization-post-pack-readiness-incomplete');
assert.deepEqual(incomplete.readiness.failed, [
  'fullEightMemberPackPreserved',
  'packMemberRunnable',
  'sourceReplayCursorAuthority',
]);

const changedRuntimeGates = selectTargetTimeframeMaterializationPostPackSlice({
  chartHistoryFastPathUnchanged: false,
  coverage: completedCoverage,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedRuntimeGates.status, 'blocked');
assert.deepEqual(changedRuntimeGates.readiness.failed, [
  'chartHistoryFastPathUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

const noCandidate = selectTargetTimeframeMaterializationPostPackSlice({
  candidates: ['unknown-post-pack-slice'],
  coverage: completedCoverage,
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.reason, 'no-target-timeframe-materialization-post-pack-candidate');

console.log('v6 target timeframe materialization post-pack selection step340 smoke passed');
