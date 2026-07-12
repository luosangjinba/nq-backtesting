import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffRuntimePlan,
  validateNarrowReplayMaterializationRuntimeHandoffRuntimePlan,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-runtime-plan.js';

const completeEvidence = Object.freeze({
  appRegistrationDeferred: true,
  dispatchWrapperOrderDefined: true,
  executorInvocationDefined: true,
  lifecycleDefined: true,
  noLiveCommandDispatch: true,
  noLiveEventSubscription: true,
  rollbackGatesDefined: true,
  step359AuditAccepted: true,
  subscriptionCleanupDefined: true,
});

const plan = createNarrowReplayMaterializationRuntimeHandoffRuntimePlan({
  evidence: completeEvidence,
});

assert.equal(plan.id, 'narrow-replay-materialization-runtime-handoff-runtime-plan');
assert.equal(plan.ready, true);
assert.deepEqual(plan.failed, []);
assert.equal(plan.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(plan.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(plan.executorFunction, 'executeNarrowReplayMaterializationRuntimeHandoffPlan');
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.appRegistrationDeferred, true);
assert.equal(plan.sourceReplayCursorAuthority, '1m');
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-contract');
assert.deepEqual(plan.lifecyclePlan.map((step) => step.id), [
  'create-runtime-helper',
  'start-subscribe-manual-next',
  'handle-event-dispatch-wrapper',
  'invoke-pure-executor',
  'stop-cleanup-subscription',
]);
assert.equal(
  plan.lifecyclePlan.find((step) => step.id === 'start-subscribe-manual-next').eventSurface,
  'chartEntryManualNext:advanced',
);
assert.deepEqual(plan.dispatchWrapperOrder.map((step) => step.commandSurface), [
  'pane.getById',
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
  'chartData.replaceBars',
]);
assert.deepEqual(plan.rollbackGates, [
  'disable-runtime-registration',
  'skip-manual-next-advanced-subscription',
  'disable-dispatch-wrapper',
  'executor-fallback-preserves-current-display',
  'stop-cleans-subscription',
]);
assert.equal(plan.forbiddenRuntimePlanActions.includes('app-js-registration-now'), true);
assert.equal(plan.forbiddenRuntimePlanActions.includes('live-command-dispatch-now'), true);
assert.equal(plan.forbiddenRuntimePlanActions.includes('manual-next-runtime-modification'), true);
assert.deepEqual(validateNarrowReplayMaterializationRuntimeHandoffRuntimePlan(plan), { errors: [], valid: true });

const blocked = createNarrowReplayMaterializationRuntimeHandoffRuntimePlan({
  evidence: {
    ...completeEvidence,
    dispatchWrapperOrderDefined: false,
    noLiveCommandDispatch: false,
    step359AuditAccepted: false,
  },
});
assert.equal(blocked.ready, false);
assert.equal(blocked.selectedNextStep, null);
assert.deepEqual(blocked.failed, [
  'dispatchWrapperOrderDefined',
  'noLiveCommandDispatch',
  'step359AuditAccepted',
]);

const invalid = validateNarrowReplayMaterializationRuntimeHandoffRuntimePlan({
  ...plan,
  dispatchWrapperOrder: [],
  id: 'bad',
  lifecyclePlan: [],
  ownerBoundary: 'runtime.display-timeframe',
  rollbackGates: [],
  runtimeBehaviorChanges: true,
  runtimeWiringReady: true,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'id',
    'ownerBoundary',
    'runtimeWiringReady',
    'lifecyclePlan',
    'lifecyclePlan',
    'lifecyclePlan',
    'lifecyclePlan',
    'lifecyclePlan',
    'dispatchWrapperOrder',
    'dispatchWrapperOrder',
    'dispatchWrapperOrder',
    'dispatchWrapperOrder',
    'dispatchWrapperOrder',
    'dispatchWrapperOrder',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
  ],
);

console.log('v6 narrow replay materialization runtime handoff runtime plan step360 smoke passed');
