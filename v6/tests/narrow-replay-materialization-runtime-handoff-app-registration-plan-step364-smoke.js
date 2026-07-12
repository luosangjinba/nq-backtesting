import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan,
  validateNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-app-registration-plan.js';

const completeEvidence = Object.freeze({
  appDiffDefined: true,
  appRegistrationDeferred: true,
  appSourceUnchanged: true,
  dependencyInjectionDefined: true,
  focusedBrowserSmokeDefined: true,
  rollbackGatesDefined: true,
  step363ReadinessAccepted: true,
  verificationOrderDefined: true,
});

const plan = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan({
  evidence: completeEvidence,
});

assert.equal(plan.id, 'narrow-replay-materialization-runtime-handoff-app-registration-plan');
assert.equal(plan.ready, true);
assert.deepEqual(plan.failed, []);
assert.equal(plan.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(plan.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(plan.appJsChangesNow, false);
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.runtimeRegistrationWired, false);
assert.equal(plan.sourceReplayCursorAuthority, '1m');
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(
  plan.selectedNextStep,
  'replay-coordination-materialization-runtime-handoff-app-registration',
);
assert.deepEqual(plan.minimalAppJsDiffPlan.map((step) => step.id), [
  'add-dispatch-command-import',
  'add-runtime-factory-import',
  'register-runtime-after-manual-next',
]);
assert.equal(
  plan.minimalAppJsDiffPlan.find((step) => step.id === 'add-runtime-factory-import').surface.importPath,
  './replay/replay-coordination-materialization-runtime-handoff.js',
);
assert.equal(
  plan.minimalAppJsDiffPlan.find((step) => step.id === 'register-runtime-after-manual-next').surface.statement,
  'registry.registerRuntime(createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand }));',
);
assert.equal(
  plan.dependencyInjectionPlan.dispatchCommand.importPath,
  './runtime/commands.js',
);
assert.equal(
  plan.dependencyInjectionPlan.executor.injectionPolicy,
  'use skeleton default executor in app registration',
);
assert.equal(
  plan.focusedBrowserSmokePlan.file,
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
);
assert.deepEqual(plan.focusedBrowserSmokePlan.assertions, [
  'runtime-registry-includes-runtime.replay-coordination-materialization-handoff',
  'manual-next-advanced-flow-remains-source-1m-driven',
  'target-bars-remain-display-materialization-input-only',
  'step337-replay-coordination-smoke-still-passes',
  'step352-producer-flow-readout-smoke-still-passes',
]);
assert.deepEqual(plan.rollbackGates, [
  'remove-dispatch-command-import-from-app-if-unused',
  'remove-runtime-factory-import-from-app',
  'remove-runtime-registration-call-from-app',
  'disable-focused-registration-browser-smoke',
  'preserve-step362-unwired-runtime-skeleton',
  'preserve-step358-pure-executor',
]);
assert.equal(plan.verificationOrder.includes('git diff --check'), true);
assert.equal(plan.forbiddenPlanActions.includes('modify-app-js-in-step364'), true);
assert.equal(plan.forbiddenPlanActions.includes('register-runtime-in-step364'), true);
assert.deepEqual(validateNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan(plan), {
  errors: [],
  valid: true,
});

const blocked = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan({
  evidence: {
    ...completeEvidence,
    appDiffDefined: false,
    step363ReadinessAccepted: false,
    verificationOrderDefined: false,
  },
});
assert.equal(blocked.ready, false);
assert.equal(blocked.selectedNextStep, null);
assert.deepEqual(blocked.failed, [
  'appDiffDefined',
  'readinessAuditReady',
  'verificationOrderDefined',
]);

const invalid = validateNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan({
  ...plan,
  appJsChangesNow: true,
  id: 'bad',
  minimalAppJsDiffPlan: [],
  ownerBoundary: 'runtime.display-timeframe',
  rollbackGates: [],
  runtimeBehaviorChanges: true,
  runtimeRegistrationWired: true,
  verificationOrder: [],
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'id',
    'ownerBoundary',
    'runtimeRegistrationWired',
    'minimalAppJsDiffPlan',
    'minimalAppJsDiffPlan',
    'minimalAppJsDiffPlan',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'rollbackGates',
    'verificationOrder',
    'verificationOrder',
    'verificationOrder',
    'verificationOrder',
  ],
);

console.log('v6 narrow replay materialization runtime handoff app registration plan step364 smoke passed');
