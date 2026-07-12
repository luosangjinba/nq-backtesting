import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffRuntimeContract,
  validateNarrowReplayMaterializationRuntimeHandoffRuntimeContract,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-runtime-contract.js';

const completeEvidence = Object.freeze({
  appRegistrationPreconditionsDefined: true,
  dependencyShapeDefined: true,
  diagnosticsResultShapeDefined: true,
  factorySignatureDefined: true,
  fallbackResultShapeDefined: true,
  runtimePlanAccepted: true,
  wrapperResultShapeDefined: true,
});

const contract = createNarrowReplayMaterializationRuntimeHandoffRuntimeContract({
  evidence: completeEvidence,
});

assert.equal(contract.id, 'narrow-replay-materialization-runtime-handoff-runtime-contract');
assert.equal(contract.ready, true);
assert.deepEqual(contract.failed, []);
assert.equal(contract.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(contract.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(contract.factorySignature.name, 'createReplayCoordinationMaterializationRuntimeHandoff');
assert.deepEqual(contract.factorySignature.returns, ['id', 'start', 'stop']);
assert.deepEqual(contract.dependencyShape, {
  dispatchCommand: 'function',
  executor: 'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  subscribeEvent: 'function',
});
assert.deepEqual(contract.wrapperResultShape, {
  commandIntents: 'array',
  fallbackGateId: 'string|null',
  replaceIntent: 'object|null',
  status: 'ready|fallback|blocked',
});
assert.deepEqual(contract.fallbackResultShape, {
  replaceIntent: null,
  runtimeBehaviorChanges: false,
  runtimeWiringReady: false,
  status: 'fallback',
});
assert.deepEqual(contract.diagnosticsResultShape, {
  eventSurface: null,
  mode: 'no-op-until-runtime-wiring',
  payloadFields: ['ownerBoundary', 'status', 'fallbackGateId', 'replaceIntent'],
});
assert.deepEqual(contract.commandSurfaces, [
  'pane.getById',
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
  'chartData.replaceBars',
]);
assert.deepEqual(contract.appRegistrationPreconditions, [
  'runtime-contract-accepted',
  'runtime-plan-accepted',
  'pure-executor-accepted',
  'wiring-readiness-audit-accepted',
  'app-registration-step-selected',
]);
assert.equal(contract.forbiddenContractActions.includes('register-runtime-now'), true);
assert.equal(contract.forbiddenContractActions.includes('dispatch-command-now'), true);
assert.equal(contract.forbiddenContractActions.includes('route-target-bars-through-replay-runtime'), true);
assert.equal(contract.runtimeBehaviorChanges, false);
assert.equal(contract.runtimeWiringReady, false);
assert.equal(contract.sourceReplayCursorAuthority, '1m');
assert.equal(contract.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(contract.selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-skeleton');
assert.deepEqual(validateNarrowReplayMaterializationRuntimeHandoffRuntimeContract(contract), { errors: [], valid: true });

const blocked = createNarrowReplayMaterializationRuntimeHandoffRuntimeContract({
  evidence: {
    ...completeEvidence,
    dependencyShapeDefined: false,
    runtimePlanAccepted: false,
    wrapperResultShapeDefined: false,
  },
});
assert.equal(blocked.ready, false);
assert.equal(blocked.selectedNextStep, null);
assert.deepEqual(blocked.failed, [
  'dependencyShapeDefined',
  'runtimePlanAccepted',
  'wrapperResultShapeDefined',
]);

const invalid = validateNarrowReplayMaterializationRuntimeHandoffRuntimeContract({
  ...contract,
  appRegistrationPreconditions: [],
  commandSurfaces: [],
  dependencyShape: {
    executor: 'wrong',
  },
  factorySignature: {
    name: 'wrong',
  },
  id: 'bad',
  ownerBoundary: 'runtime.display-timeframe',
  runtimeBehaviorChanges: true,
  runtimeWiringReady: true,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'id',
    'ownerBoundary',
    'factorySignature',
    'dependencyShape',
    'runtimeWiringReady',
    'commandSurfaces',
    'commandSurfaces',
    'commandSurfaces',
    'commandSurfaces',
    'commandSurfaces',
    'commandSurfaces',
    'appRegistrationPreconditions',
    'appRegistrationPreconditions',
    'appRegistrationPreconditions',
    'appRegistrationPreconditions',
    'appRegistrationPreconditions',
  ],
);

console.log('v6 narrow replay materialization runtime handoff runtime contract step361 smoke passed');
