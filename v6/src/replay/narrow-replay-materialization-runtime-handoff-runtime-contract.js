import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { createNarrowReplayMaterializationRuntimeHandoffRuntimePlan } from './narrow-replay-materialization-runtime-handoff-runtime-plan.js';

const CONTRACT_ID = 'narrow-replay-materialization-runtime-handoff-runtime-contract';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';
const FACTORY_NAME = 'createReplayCoordinationMaterializationRuntimeHandoff';
const EXECUTOR_FUNCTION = 'executeNarrowReplayMaterializationRuntimeHandoffPlan';

const FACTORY_SIGNATURE = Object.freeze({
  dependenciesArgument: 'dependencies',
  name: FACTORY_NAME,
  returns: Object.freeze(['id', 'start', 'stop']),
});

const DEPENDENCY_SHAPE = Object.freeze({
  dispatchCommand: 'function',
  executor: EXECUTOR_FUNCTION,
  subscribeEvent: 'function',
});

const WRAPPER_RESULT_SHAPE = Object.freeze({
  commandIntents: 'array',
  fallbackGateId: 'string|null',
  replaceIntent: 'object|null',
  status: 'ready|fallback|blocked',
});

const FALLBACK_RESULT_SHAPE = Object.freeze({
  replaceIntent: null,
  runtimeBehaviorChanges: false,
  runtimeWiringReady: false,
  status: 'fallback',
});

const DIAGNOSTICS_RESULT_SHAPE = Object.freeze({
  eventSurface: null,
  mode: 'no-op-until-runtime-wiring',
  payloadFields: Object.freeze(['ownerBoundary', 'status', 'fallbackGateId', 'replaceIntent']),
});

const APP_REGISTRATION_PRECONDITIONS = Object.freeze([
  'runtime-contract-accepted',
  'runtime-plan-accepted',
  'pure-executor-accepted',
  'wiring-readiness-audit-accepted',
  'app-registration-step-selected',
]);

const COMMAND_SURFACES = Object.freeze([
  PANE_COMMANDS.GET_BY_ID,
  REPLAY_COMMANDS.GET_STATE,
  CHART_DATA_COMMANDS.GET_SOURCE_BARS,
  BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
  BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
  CHART_DATA_COMMANDS.REPLACE_BARS,
]);

const FORBIDDEN_CONTRACT_ACTIONS = Object.freeze([
  'register-runtime-now',
  'subscribe-event-now',
  'dispatch-command-now',
  'emit-diagnostics-now',
  'modify-producer-runtimes',
  'route-target-bars-through-replay-runtime',
  'mutate-viewport-intent',
  'direct-chart-render-write',
]);

function normalizeEvidence(evidence = {}) {
  return {
    appRegistrationPreconditionsDefined: Boolean(evidence.appRegistrationPreconditionsDefined),
    dependencyShapeDefined: Boolean(evidence.dependencyShapeDefined),
    diagnosticsResultShapeDefined: Boolean(evidence.diagnosticsResultShapeDefined),
    factorySignatureDefined: Boolean(evidence.factorySignatureDefined),
    fallbackResultShapeDefined: Boolean(evidence.fallbackResultShapeDefined),
    runtimePlanAccepted: Boolean(evidence.runtimePlanAccepted),
    wrapperResultShapeDefined: Boolean(evidence.wrapperResultShapeDefined),
  };
}

export function createNarrowReplayMaterializationRuntimeHandoffRuntimeContract({
  evidence = {},
  runtimePlan = createNarrowReplayMaterializationRuntimeHandoffRuntimePlan({
    evidence: {
      appRegistrationDeferred: true,
      dispatchWrapperOrderDefined: true,
      executorInvocationDefined: true,
      lifecycleDefined: true,
      noLiveCommandDispatch: true,
      noLiveEventSubscription: true,
      rollbackGatesDefined: true,
      step359AuditAccepted: true,
      subscriptionCleanupDefined: true,
    },
  }),
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    appRegistrationPreconditionsDefined: normalizedEvidence.appRegistrationPreconditionsDefined,
    dependencyShapeDefined: normalizedEvidence.dependencyShapeDefined,
    diagnosticsResultShapeDefined: normalizedEvidence.diagnosticsResultShapeDefined,
    factorySignatureDefined: normalizedEvidence.factorySignatureDefined,
    fallbackResultShapeDefined: normalizedEvidence.fallbackResultShapeDefined,
    ownerBoundaryPreserved: runtimePlan.ownerBoundary === OWNER_BOUNDARY,
    runtimeBehaviorUnchanged: true,
    runtimePlanAccepted: normalizedEvidence.runtimePlanAccepted && runtimePlan.ready === true,
    runtimeWiringNotImplemented: true,
    wrapperResultShapeDefined: normalizedEvidence.wrapperResultShapeDefined,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    appRegistrationPreconditions: [...APP_REGISTRATION_PRECONDITIONS],
    checks: Object.freeze(checks),
    commandSurfaces: [...COMMAND_SURFACES],
    dependencyShape: { ...DEPENDENCY_SHAPE },
    diagnosticsResultShape: {
      ...DIAGNOSTICS_RESULT_SHAPE,
      payloadFields: [...DIAGNOSTICS_RESULT_SHAPE.payloadFields],
    },
    factorySignature: {
      ...FACTORY_SIGNATURE,
      returns: [...FACTORY_SIGNATURE.returns],
    },
    failed: Object.freeze(failed),
    fallbackResultShape: { ...FALLBACK_RESULT_SHAPE },
    forbiddenContractActions: [...FORBIDDEN_CONTRACT_ACTIONS],
    id: CONTRACT_ID,
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    ready: failed.length === 0,
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    selectedNextStep: failed.length ? null : 'narrow-replay-materialization-runtime-handoff-runtime-skeleton',
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
    wrapperResultShape: { ...WRAPPER_RESULT_SHAPE },
  });
}

export function validateNarrowReplayMaterializationRuntimeHandoffRuntimeContract(contract = {}) {
  const errors = [];
  const commandSurfaces = new Set(contract.commandSurfaces || []);
  const preconditions = new Set(contract.appRegistrationPreconditions || []);

  if (contract.id !== CONTRACT_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Runtime handoff contract id is invalid.' }));
  }
  if (contract.ownerBoundary !== OWNER_BOUNDARY) {
    errors.push(Object.freeze({ field: 'ownerBoundary', message: 'Runtime handoff owner boundary changed.' }));
  }
  if (contract.factorySignature?.name !== FACTORY_NAME) {
    errors.push(Object.freeze({ field: 'factorySignature', message: 'Runtime handoff factory name is invalid.' }));
  }
  if (contract.dependencyShape?.executor !== EXECUTOR_FUNCTION) {
    errors.push(Object.freeze({ field: 'dependencyShape', message: 'Runtime handoff executor dependency is invalid.' }));
  }
  if (contract.runtimeBehaviorChanges !== false || contract.runtimeWiringReady !== false) {
    errors.push(Object.freeze({ field: 'runtimeWiringReady', message: 'Step 361 must remain contract-only.' }));
  }
  for (const commandSurface of COMMAND_SURFACES) {
    if (!commandSurfaces.has(commandSurface)) {
      errors.push(Object.freeze({ field: 'commandSurfaces', message: `Missing command surface: ${commandSurface}.` }));
    }
  }
  for (const precondition of APP_REGISTRATION_PRECONDITIONS) {
    if (!preconditions.has(precondition)) {
      errors.push(Object.freeze({ field: 'appRegistrationPreconditions', message: `Missing app registration precondition: ${precondition}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
