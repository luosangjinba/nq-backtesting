import assert from 'node:assert/strict';
import {
  auditTargetMaterializationDiagnosticsReadoutChain,
  selectTargetMaterializationDiagnosticsReadoutChainNextSlice,
} from './governance/helpers/replay/target-materialization-diagnostics-readout-chain-selection.js';

const completedEvidence = {
  combinationPackCovered: true,
  defaultPackPreserved: true,
  noDirectUpdateSnapshot: true,
  optionalMembersPreserved: true,
  producerFlowReadoutCovered: true,
  replayCoordinationPackCovered: true,
  shellConsumptionCommandEventOnly: true,
  sourceReplayCursorAuthority: true,
  targetBarsDisplayInputOnly: true,
};

const readiness = auditTargetMaterializationDiagnosticsReadoutChain({
  evidence: completedEvidence,
});
assert.equal(readiness.ready, true);
assert.deepEqual(readiness.failed, []);
assert.equal(readiness.checks.replayCoordinationPackCovered, true);
assert.equal(readiness.checks.producerFlowReadoutCovered, true);
assert.equal(readiness.checks.combinationPackCovered, true);
assert.equal(readiness.checks.defaultPackPreserved, true);

const selected = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  evidence: completedEvidence,
});
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'narrow-replay-materialization-runtime-handoff-readiness-audit');
assert.equal(selected.ownerBoundary, 'target-materialization-runtime-handoff-readiness');
assert.equal(selected.reason, 'diagnostics-readout-chain-packaged-select-runtime-handoff-readiness-audit');
assert.deepEqual(selected.affectedRuntimes, []);
assert.equal(selected.acceptanceGates.includes('step337-replay-coordination-browser-covered'), true);
assert.equal(selected.acceptanceGates.includes('step352-producer-flow-readout-browser-covered'), true);
assert.equal(selected.acceptanceGates.includes('step354-combination-pack-covered'), true);
assert.equal(selected.acceptanceGates.includes('no-runtime-behavior-change-in-selection-step'), true);
assert.equal(selected.forbiddenActions.includes('route-target-bars-through-replay-runtime'), true);
assert.equal(selected.rollbackCriteria.includes('observability-pack-combination-regresses'), true);

const runtimeTooEarly = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  candidates: ['narrow-replay-materialization-runtime-handoff'],
  evidence: completedEvidence,
});
assert.equal(runtimeTooEarly.status, 'blocked');
assert.equal(runtimeTooEarly.selectedSlice, null);
assert.equal(runtimeTooEarly.reason, 'runtime-handoff-deferred-until-readiness-audit');

const moreDiagnosticsBlocked = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  candidates: ['more-diagnostics-readout-pack-wiring'],
  evidence: completedEvidence,
});
assert.equal(moreDiagnosticsBlocked.status, 'blocked');
assert.equal(moreDiagnosticsBlocked.selectedSlice, null);
assert.equal(
  moreDiagnosticsBlocked.reason,
  'diagnostics-readout-chain-already-packaged-no-more-pack-wiring-selected',
);

const incomplete = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  evidence: {
    ...completedEvidence,
    combinationPackCovered: false,
    noDirectUpdateSnapshot: false,
    shellConsumptionCommandEventOnly: false,
  },
});
assert.equal(incomplete.status, 'blocked');
assert.equal(incomplete.reason, 'target-materialization-diagnostics-readout-chain-readiness-incomplete');
assert.deepEqual(incomplete.readiness.failed, [
  'combinationPackCovered',
  'noDirectUpdateSnapshot',
  'shellConsumptionCommandEventOnly',
]);

const changedRuntimeGates = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  chartHistoryFastPathUnchanged: false,
  evidence: completedEvidence,
  producerRuntimesUnchanged: false,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedRuntimeGates.status, 'blocked');
assert.deepEqual(changedRuntimeGates.readiness.failed, [
  'chartHistoryFastPathUnchanged',
  'producerRuntimesUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

const noCandidate = selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  candidates: ['unknown-future-slice'],
  evidence: completedEvidence,
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.reason, 'no-target-materialization-diagnostics-readout-chain-candidate');

console.log('v6 target materialization diagnostics readout chain selection step355 smoke passed');
