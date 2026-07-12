import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsWiringPlan,
  getTargetMaterializationReplayDiagnosticsConsumerSequence,
  getTargetMaterializationReplayDiagnosticsProducerSequence,
  getTargetMaterializationReplayDiagnosticsWiringFallbackGates,
  getTargetMaterializationReplayDiagnosticsWiringForbiddenActions,
  getTargetMaterializationReplayDiagnosticsWiringOwner,
  getTargetMaterializationReplayDiagnosticsWiringPlanId,
  getTargetMaterializationReplayDiagnosticsWiringRollbackCriteria,
  validateTargetMaterializationReplayDiagnosticsWiringPlan,
} from '../src/replay/target-materialization-replay-diagnostics-wiring-plan.js';

assert.equal(
  getTargetMaterializationReplayDiagnosticsWiringPlanId(),
  'target-materialization-replay-diagnostics-runtime-wiring-plan',
);
assert.equal(
  getTargetMaterializationReplayDiagnosticsWiringOwner(),
  'runtime.target-materialization-replay-diagnostics',
);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsProducerSequence().map((step) => step.id),
  [
    'consume-display-timeframe-applied',
    'consume-manual-next-advanced',
    'consume-auto-play-ticked',
    'consume-auto-play-started',
    'consume-auto-play-stopped',
  ],
);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsProducerSequence().map((step) => step.consumesEvent),
  [
    'displayTimeframe:applied',
    'chartEntryManualNext:advanced',
    'chartEntryAutoPlay:ticked',
    'chartEntryAutoPlay:started',
    'chartEntryAutoPlay:stopped',
  ],
);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsProducerSequence()
    .map((step) => step.updateSurface)
    .filter(Boolean),
  [
    'targetMaterializationReplayDiagnostics.updateSnapshot',
    'targetMaterializationReplayDiagnostics.updateSnapshot',
    'targetMaterializationReplayDiagnostics.updateSnapshot',
    'targetMaterializationReplayDiagnostics.updateSnapshot',
    'targetMaterializationReplayDiagnostics.updateSnapshot',
  ],
);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsConsumerSequence().map((step) => step.id),
  [
    'shell-consume-snapshot-ready',
    'shell-read-current-snapshot',
  ],
);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsWiringFallbackGates(), [
  'diagnostics-runtime-started',
  'producer-event-payload-normalized',
  'snapshot-validation-preserves-source-cursor-authority',
  'snapshot-validation-preserves-target-bars-display-input-only',
  'shell-consumes-command-event-snapshot-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
]);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsWiringRollbackCriteria(), [
  'diagnostics-wiring-mutates-replay-cursor',
  'diagnostics-wiring-loads-target-bars',
  'diagnostics-wiring-writes-chart-data',
  'diagnostics-wiring-mutates-viewport-intent',
  'diagnostics-wiring-writes-visible-ui-before-readout-step',
  'diagnostics-wiring-regresses-replay-coordination-pack',
]);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsWiringForbiddenActions(), [
  'dispatch replay.next',
  'dispatch replay.previous',
  'dispatch replay.setCursorTime',
  'dispatch barData.planTargetWindow',
  'dispatch barData.loadTargetWindow',
  'dispatch chartData.replaceBars',
  'dispatch chartData.appendBars',
  'dispatch chartViewport.resetView',
  'call target bars API directly',
  'write chart engine series directly',
  'write visible shell diagnostics UI',
  'change target-history request sizing',
  'change chart-history fast-path delay policy',
]);

const plan = createTargetMaterializationReplayDiagnosticsWiringPlan();
assert.equal(plan.id, 'target-materialization-replay-diagnostics-runtime-wiring-plan');
assert.equal(plan.owner, 'runtime.target-materialization-replay-diagnostics');
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.updateCommandReady, false);
assert.equal(plan.shellVisibleUiReady, false);
assert.equal(plan.preservesSourceReplayCursorAuthority, true);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);
assert.equal(plan.chartHistoryFastPathUnchanged, true);
assert.equal(Object.isFrozen(plan), true);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsWiringPlan(plan), {
  errors: [],
  valid: true,
});

const invalidPlan = validateTargetMaterializationReplayDiagnosticsWiringPlan({
  ...plan,
  chartHistoryFastPathUnchanged: false,
  consumerSequence: [],
  fallbackGates: [],
  forbiddenActions: [],
  id: 'bad',
  owner: 'display-timeframe-runtime',
  preservesSourceReplayCursorAuthority: false,
  producerSequence: [],
  rollbackCriteria: [],
  runtimeBehaviorChanges: true,
  runtimeWiringReady: true,
  shellVisibleUiReady: true,
  targetBarsDisplayMaterializationInputOnly: false,
  targetHistoryRequestSizingUnchanged: false,
  updateCommandReady: true,
});
assert.equal(invalidPlan.valid, false);
assert.ok(invalidPlan.errors.length > 30);
assert.ok(invalidPlan.errors.some((error) => error.message.includes('displayTimeframe:applied')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('targetMaterializationReplayDiagnostics.updateSnapshot')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('diagnostics-wiring-mutates-replay-cursor')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('dispatch barData.loadTargetWindow')));

console.log('v6 target materialization replay diagnostics wiring plan step343 smoke passed');
