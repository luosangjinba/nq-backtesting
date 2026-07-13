import assert from 'node:assert/strict';
import {
  auditNarrowReplayMaterializationRuntimeHandoffReadiness,
  createNarrowReplayMaterializationRuntimeHandoffReadinessReport,
} from './governance/helpers/replay/narrow-replay-materialization-runtime-handoff-readiness-audit.js';

const completedEvidence = {
  autoPlayCoveredThroughManualNext: true,
  barDataTargetWindowSurfacesAvailable: true,
  chartDataReplacePreservesSource: true,
  defaultPackPreserved: true,
  diagnosticsRuntimeReadOnly: true,
  displayTimeframeRuntimeOwnsTfSwitch: true,
  manualNextAdvancedEventAvailable: true,
  optionalPackMembersPreserved: true,
  sourceReplayCursorAuthority: true,
  targetBarRevealPolicyCovered: true,
  targetBarsDisplayInputOnly: true,
};

const audit = auditNarrowReplayMaterializationRuntimeHandoffReadiness({
  evidence: completedEvidence,
});
assert.equal(audit.ready, true);
assert.deepEqual(audit.failed, []);
assert.equal(audit.futureOwner.selectedOwner, 'new-replay-coordination-runtime-helper');
assert.equal(audit.futureOwner.boundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(audit.allowedEventSurfaces.includes('chartEntryManualNext:advanced'), true);
assert.equal(audit.allowedCommandSurfaces.includes('replay.getState'), true);
assert.equal(audit.allowedCommandSurfaces.includes('barData.planTargetWindow'), true);
assert.equal(audit.allowedCommandSurfaces.includes('barData.loadTargetWindow'), true);
assert.equal(audit.allowedCommandSurfaces.includes('chartData.replaceBars'), true);
assert.equal(audit.forbiddenSurfaces.includes('replay.next'), true);
assert.equal(audit.forbiddenSurfaces.includes('replay.setCursorTime'), true);
assert.equal(audit.forbiddenSurfaces.includes('targetMaterializationReplayDiagnostics.updateSnapshot'), true);

const report = createNarrowReplayMaterializationRuntimeHandoffReadinessReport({
  evidence: completedEvidence,
});
assert.equal(report.status, 'ready');
assert.equal(report.nextStep, 'narrow-replay-materialization-runtime-handoff-plan');
assert.equal(report.reason, 'runtime-handoff-surfaces-ready-select-plan-before-behavior-wiring');
assert.equal(report.selectedOwnerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(report.acceptanceGates.includes('manual-next-advanced-event-is-primary-trigger'), true);
assert.equal(report.acceptanceGates.includes('auto-play-covered-through-manual-next-advanced'), true);
assert.equal(report.acceptanceGates.includes('diagnostics-runtime-remains-read-only-observability'), true);
assert.equal(report.acceptanceGates.includes('no-runtime-behavior-change-in-audit-step'), true);

const incomplete = createNarrowReplayMaterializationRuntimeHandoffReadinessReport({
  evidence: {
    ...completedEvidence,
    barDataTargetWindowSurfacesAvailable: false,
    manualNextAdvancedEventAvailable: false,
    sourceReplayCursorAuthority: false,
  },
});
assert.equal(incomplete.status, 'blocked');
assert.equal(incomplete.nextStep, null);
assert.equal(incomplete.reason, 'narrow-replay-materialization-runtime-handoff-readiness-incomplete');
assert.deepEqual(incomplete.audit.failed, [
  'barDataTargetWindowSurfacesAvailable',
  'manualNextAdvancedEventAvailable',
  'sourceReplayCursorAuthority',
]);

const changedRuntimeGates = createNarrowReplayMaterializationRuntimeHandoffReadinessReport({
  chartHistoryFastPathUnchanged: false,
  evidence: completedEvidence,
  producerRuntimesUnchanged: false,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedRuntimeGates.status, 'blocked');
assert.deepEqual(changedRuntimeGates.audit.failed, [
  'chartHistoryFastPathUnchanged',
  'producerRuntimesUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

console.log('v6 narrow replay materialization runtime handoff readiness step356 smoke passed');
