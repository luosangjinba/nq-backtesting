import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { createNarrowReplayMaterializationRuntimeHandoffPlan } from './narrow-replay-materialization-runtime-handoff-plan.js';
import { createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit } from './narrow-replay-materialization-runtime-handoff-wiring-readiness-audit.js';

const PLAN_ID = 'narrow-replay-materialization-runtime-handoff-runtime-plan';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';
const EXECUTOR_FUNCTION = 'executeNarrowReplayMaterializationRuntimeHandoffPlan';

const LIFECYCLE_PLAN = Object.freeze([
  Object.freeze({
    id: 'create-runtime-helper',
    phase: 'factory',
    action: 'create runtime helper with isolated unsubscribe and in-flight state',
  }),
  Object.freeze({
    id: 'start-subscribe-manual-next',
    phase: 'start',
    action: 'subscribe to Manual Next advanced event',
    eventSurface: CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
  }),
  Object.freeze({
    id: 'handle-event-dispatch-wrapper',
    phase: 'event',
    action: 'gather command results through runtime-owned wrapper',
  }),
  Object.freeze({
    id: 'invoke-pure-executor',
    phase: 'event',
    action: 'invoke pure executor and branch on replace intent or fallback gate',
    executor: EXECUTOR_FUNCTION,
  }),
  Object.freeze({
    id: 'stop-cleanup-subscription',
    phase: 'stop',
    action: 'call unsubscribe callback and clear in-flight state',
  }),
]);

const DISPATCH_WRAPPER_ORDER = Object.freeze([
  Object.freeze({ commandSurface: PANE_COMMANDS.GET_BY_ID, id: 'resolve-pane-context' }),
  Object.freeze({ commandSurface: REPLAY_COMMANDS.GET_STATE, id: 'read-replay-cursor' }),
  Object.freeze({ commandSurface: CHART_DATA_COMMANDS.GET_SOURCE_BARS, id: 'read-source-bars' }),
  Object.freeze({ commandSurface: BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW, id: 'plan-target-window' }),
  Object.freeze({ commandSurface: BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW, id: 'load-target-window' }),
  Object.freeze({ commandSurface: CHART_DATA_COMMANDS.REPLACE_BARS, id: 'replace-display-bars' }),
]);

const ROLLBACK_GATES = Object.freeze([
  'disable-runtime-registration',
  'skip-manual-next-advanced-subscription',
  'disable-dispatch-wrapper',
  'executor-fallback-preserves-current-display',
  'stop-cleans-subscription',
]);

const FORBIDDEN_RUNTIME_PLAN_ACTIONS = Object.freeze([
  'app-js-registration-now',
  'live-event-subscription-now',
  'live-command-dispatch-now',
  'manual-next-runtime-modification',
  'auto-play-runtime-modification',
  'display-timeframe-runtime-modification',
  'diagnostics-runtime-modification',
  'replay-runtime-target-bar-routing',
  'viewport-intent-mutation',
  'chart-render-direct-write',
]);

function clonePlanStep(step = {}) {
  return { ...step };
}

function normalizeEvidence(evidence = {}) {
  return {
    appRegistrationDeferred: Boolean(evidence.appRegistrationDeferred),
    dispatchWrapperOrderDefined: Boolean(evidence.dispatchWrapperOrderDefined),
    executorInvocationDefined: Boolean(evidence.executorInvocationDefined),
    lifecycleDefined: Boolean(evidence.lifecycleDefined),
    noLiveCommandDispatch: Boolean(evidence.noLiveCommandDispatch),
    noLiveEventSubscription: Boolean(evidence.noLiveEventSubscription),
    rollbackGatesDefined: Boolean(evidence.rollbackGatesDefined),
    step359AuditAccepted: Boolean(evidence.step359AuditAccepted),
    subscriptionCleanupDefined: Boolean(evidence.subscriptionCleanupDefined),
  };
}

export function createNarrowReplayMaterializationRuntimeHandoffRuntimePlan({
  evidence = {},
  materializationPlan = createNarrowReplayMaterializationRuntimeHandoffPlan(),
  wiringAudit = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit({
    evidence: {
      appRegistrySurfaceAvailable: true,
      commandDispatchWrapperShapeDefined: true,
      eventSubscriptionSurfaceAvailable: true,
      executorAvailable: true,
      noProducerRuntimeChanges: true,
      rollbackCriteriaDefined: true,
      step357PlanAccepted: true,
      step358ExecutorAccepted: true,
    },
    plan: materializationPlan,
  }),
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    appRegistrationDeferred: normalizedEvidence.appRegistrationDeferred,
    dispatchWrapperOrderDefined: normalizedEvidence.dispatchWrapperOrderDefined,
    executorInvocationDefined: normalizedEvidence.executorInvocationDefined,
    lifecycleDefined: normalizedEvidence.lifecycleDefined,
    noLiveCommandDispatch: normalizedEvidence.noLiveCommandDispatch,
    noLiveEventSubscription: normalizedEvidence.noLiveEventSubscription,
    ownerBoundaryPreserved: materializationPlan.ownerBoundary === OWNER_BOUNDARY && wiringAudit.ownerBoundary === OWNER_BOUNDARY,
    rollbackGatesDefined: normalizedEvidence.rollbackGatesDefined,
    runtimeBehaviorUnchanged: true,
    runtimeWiringNotImplemented: true,
    step359AuditAccepted: normalizedEvidence.step359AuditAccepted && wiringAudit.ready === true,
    subscriptionCleanupDefined: normalizedEvidence.subscriptionCleanupDefined,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    appRegistrationDeferred: true,
    checks: Object.freeze(checks),
    dispatchWrapperOrder: DISPATCH_WRAPPER_ORDER.map(clonePlanStep),
    executorFunction: EXECUTOR_FUNCTION,
    failed: Object.freeze(failed),
    forbiddenRuntimePlanActions: [...FORBIDDEN_RUNTIME_PLAN_ACTIONS],
    id: PLAN_ID,
    lifecyclePlan: LIFECYCLE_PLAN.map(clonePlanStep),
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    ready: failed.length === 0,
    rollbackGates: [...ROLLBACK_GATES],
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    selectedNextStep: failed.length ? null : 'narrow-replay-materialization-runtime-handoff-runtime-contract',
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
  });
}

export function validateNarrowReplayMaterializationRuntimeHandoffRuntimePlan(plan = {}) {
  const errors = [];
  const lifecycleIds = new Set((plan.lifecyclePlan || []).map((step) => step.id));
  const dispatchSurfaces = new Set((plan.dispatchWrapperOrder || []).map((step) => step.commandSurface));
  const rollbackGates = new Set(plan.rollbackGates || []);

  if (plan.id !== PLAN_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Runtime handoff plan id is invalid.' }));
  }
  if (plan.ownerBoundary !== OWNER_BOUNDARY) {
    errors.push(Object.freeze({ field: 'ownerBoundary', message: 'Runtime handoff owner boundary changed.' }));
  }
  if (plan.runtimeBehaviorChanges !== false || plan.runtimeWiringReady !== false) {
    errors.push(Object.freeze({ field: 'runtimeWiringReady', message: 'Step 360 must remain plan-only.' }));
  }
  for (const lifecycleId of [
    'create-runtime-helper',
    'start-subscribe-manual-next',
    'handle-event-dispatch-wrapper',
    'invoke-pure-executor',
    'stop-cleanup-subscription',
  ]) {
    if (!lifecycleIds.has(lifecycleId)) {
      errors.push(Object.freeze({ field: 'lifecyclePlan', message: `Missing lifecycle step: ${lifecycleId}.` }));
    }
  }
  for (const commandSurface of [
    PANE_COMMANDS.GET_BY_ID,
    REPLAY_COMMANDS.GET_STATE,
    CHART_DATA_COMMANDS.GET_SOURCE_BARS,
    BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
    BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
    CHART_DATA_COMMANDS.REPLACE_BARS,
  ]) {
    if (!dispatchSurfaces.has(commandSurface)) {
      errors.push(Object.freeze({ field: 'dispatchWrapperOrder', message: `Missing dispatch wrapper command: ${commandSurface}.` }));
    }
  }
  for (const rollbackGate of ROLLBACK_GATES) {
    if (!rollbackGates.has(rollbackGate)) {
      errors.push(Object.freeze({ field: 'rollbackGates', message: `Missing rollback gate: ${rollbackGate}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
