import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { createNarrowReplayMaterializationRuntimeHandoffPlan } from './narrow-replay-materialization-runtime-handoff-plan.js';

const AUDIT_ID = 'narrow-replay-materialization-runtime-handoff-wiring-readiness-audit';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';
const EXECUTOR_ID = 'narrow-replay-materialization-runtime-handoff-pure-executor';

const APP_REGISTRATION_SURFACE = Object.freeze({
  file: 'v6/src/app.js',
  insertionPoint: 'runtime registry before lifecycle start',
  runtimeFactory: 'createReplayCoordinationMaterializationRuntimeHandoff',
  runtimeId: OWNER_BOUNDARY,
});

const EVENT_SUBSCRIPTION_SURFACE = Object.freeze({
  eventSurface: CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
  owner: OWNER_BOUNDARY,
  placement: 'runtime start lifecycle',
  subscriber: OWNER_MODULE,
});

const COMMAND_DISPATCH_WRAPPER = Object.freeze({
  commandSurfaces: Object.freeze([
    PANE_COMMANDS.GET_BY_ID,
    REPLAY_COMMANDS.GET_STATE,
    CHART_DATA_COMMANDS.GET_SOURCE_BARS,
    BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
    BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
    CHART_DATA_COMMANDS.REPLACE_BARS,
  ]),
  executor: EXECUTOR_ID,
  owner: OWNER_BOUNDARY,
  shape: 'runtime-command-dispatch-wrapper-with-injected-results',
});

const ROLLBACK_CRITERIA = Object.freeze([
  'remove-app-runtime-registration',
  'remove-manual-next-advanced-subscription',
  'disable-command-dispatch-wrapper',
  'preserve-step358-pure-executor',
  'preserve-step357-plan',
]);

const FORBIDDEN_WIRING_ACTIONS = Object.freeze([
  'modify-manual-next-runtime',
  'modify-auto-play-runtime',
  'modify-display-timeframe-runtime',
  'modify-diagnostics-runtime',
  'route-target-bars-through-replay-runtime',
  'mutate-replay-cursor',
  'mutate-viewport-intent',
  'direct-chart-render-write',
  'shell-target-bars-api-call',
]);

function cloneObject(value = {}) {
  return { ...value };
}

function normalizeEvidence(evidence = {}) {
  return {
    appRegistrySurfaceAvailable: Boolean(evidence.appRegistrySurfaceAvailable),
    commandDispatchWrapperShapeDefined: Boolean(evidence.commandDispatchWrapperShapeDefined),
    eventSubscriptionSurfaceAvailable: Boolean(evidence.eventSubscriptionSurfaceAvailable),
    executorAvailable: Boolean(evidence.executorAvailable),
    noProducerRuntimeChanges: Boolean(evidence.noProducerRuntimeChanges),
    rollbackCriteriaDefined: Boolean(evidence.rollbackCriteriaDefined),
    step357PlanAccepted: Boolean(evidence.step357PlanAccepted),
    step358ExecutorAccepted: Boolean(evidence.step358ExecutorAccepted),
  };
}

export function createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit({
  evidence = {},
  plan = createNarrowReplayMaterializationRuntimeHandoffPlan(),
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    appRegistrySurfaceAvailable: normalizedEvidence.appRegistrySurfaceAvailable,
    commandDispatchWrapperShapeDefined: normalizedEvidence.commandDispatchWrapperShapeDefined,
    eventSubscriptionSurfaceAvailable: normalizedEvidence.eventSubscriptionSurfaceAvailable,
    executorAvailable: normalizedEvidence.executorAvailable,
    noProducerRuntimeChanges: normalizedEvidence.noProducerRuntimeChanges,
    ownerBoundaryPreserved: plan.ownerBoundary === OWNER_BOUNDARY,
    rollbackCriteriaDefined: normalizedEvidence.rollbackCriteriaDefined,
    runtimeBehaviorUnchanged: true,
    runtimeWiringNotImplemented: true,
    step357PlanAccepted: normalizedEvidence.step357PlanAccepted,
    step358ExecutorAccepted: normalizedEvidence.step358ExecutorAccepted,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    appRegistrationSurface: cloneObject(APP_REGISTRATION_SURFACE),
    checks: Object.freeze(checks),
    commandDispatchWrapper: {
      ...COMMAND_DISPATCH_WRAPPER,
      commandSurfaces: [...COMMAND_DISPATCH_WRAPPER.commandSurfaces],
    },
    eventSubscriptionSurface: cloneObject(EVENT_SUBSCRIPTION_SURFACE),
    failed: Object.freeze(failed),
    forbiddenWiringActions: [...FORBIDDEN_WIRING_ACTIONS],
    id: AUDIT_ID,
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    ready: failed.length === 0,
    rollbackCriteria: [...ROLLBACK_CRITERIA],
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    selectedNextStep: failed.length ? null : 'narrow-replay-materialization-runtime-handoff-runtime-plan',
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
  });
}

export function createNarrowReplayMaterializationRuntimeHandoffWiringReadinessReport(input = {}) {
  const audit = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit(input);
  return Object.freeze({
    audit,
    nextStep: audit.selectedNextStep,
    ownerBoundary: audit.ownerBoundary,
    reason: audit.ready
      ? 'wiring-surfaces-ready-select-runtime-plan-before-live-wiring'
      : 'wiring-readiness-incomplete-do-not-wire-runtime',
    status: audit.ready ? 'ready' : 'blocked',
  });
}
