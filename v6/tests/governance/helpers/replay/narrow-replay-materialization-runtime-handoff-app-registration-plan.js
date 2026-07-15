import { createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit } from './narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js';

const PLAN_ID = 'narrow-replay-materialization-runtime-handoff-app-registration-plan';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';
const RUNTIME_FACTORY = 'createReplayCoordinationMaterializationRuntimeHandoff';

const APP_IMPORT_PLAN = Object.freeze({
  file: 'v6/src/app.js',
  importName: RUNTIME_FACTORY,
  importPath: './replay/replay-coordination-materialization-runtime-handoff.js',
  insertAfter: "import { createTargetMaterializationReplayDiagnosticsRuntime } from './replay/target-materialization-replay-diagnostics-runtime.js';",
});

const COMMAND_IMPORT_PLAN = Object.freeze({
  file: 'v6/src/app.js',
  importName: 'dispatchCommand',
  importPath: './runtime/commands.js',
  insertAfter: "import { emitEvent, subscribeEvent } from './runtime/events.js';",
});

const REGISTRATION_PLAN = Object.freeze({
  file: 'v6/src/app.js',
  insertAfter: 'registry.registerRuntime(createChartEntryManualNextRuntime());',
  insertBefore: 'registry.registerRuntime(createChartEntryManualPreviousRuntime());',
  statement: 'registry.registerRuntime(createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand }));',
});

const MINIMAL_APP_JS_DIFF_PLAN = Object.freeze([
  Object.freeze({
    id: 'add-dispatch-command-import',
    operation: 'insert-import',
    surface: COMMAND_IMPORT_PLAN,
  }),
  Object.freeze({
    id: 'add-runtime-factory-import',
    operation: 'insert-import',
    surface: APP_IMPORT_PLAN,
  }),
  Object.freeze({
    id: 'register-runtime-after-manual-next',
    operation: 'insert-runtime-registration',
    surface: REGISTRATION_PLAN,
  }),
]);

const FOCUSED_BROWSER_SMOKE_PLAN = Object.freeze({
  assertions: Object.freeze([
    'runtime-registry-includes-runtime.replay-coordination-materialization-handoff',
    'manual-next-advanced-flow-remains-source-1m-driven',
    'target-bars-remain-display-materialization-input-only',
    'step337-replay-coordination-smoke-still-passes',
    'step352-producer-flow-readout-smoke-still-passes',
  ]),
  file: 'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  scope: 'focused-registration-smoke-before-full-pack',
});

const ROLLBACK_GATES = Object.freeze([
  'remove-dispatch-command-import-from-app-if-unused',
  'remove-runtime-factory-import-from-app',
  'remove-runtime-registration-call-from-app',
  'disable-focused-registration-browser-smoke',
  'preserve-step362-unwired-runtime-skeleton',
  'preserve-step358-pure-executor',
]);

const VERIFICATION_ORDER = Object.freeze([
  'node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js',
  'node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js',
  'node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js',
  'node v6/tests/app-shell-browser-smoke.js',
  'node v6/tests/boundary-smoke.js',
  'git diff --check',
]);

const FORBIDDEN_PLAN_ACTIONS = Object.freeze([
  'modify-app-js-in-step364',
  'register-runtime-in-step364',
  'subscribe-event-in-step364',
  'dispatch-command-in-step364',
  'modify-producer-runtimes',
  'route-target-bars-through-replay-runtime',
  'change-replay-cursor-movement',
  'change-chart-viewport-intent',
]);

function cloneDiffStep(step = {}) {
  return {
    ...step,
    surface: { ...step.surface },
  };
}

function cloneBrowserSmokePlan() {
  return {
    ...FOCUSED_BROWSER_SMOKE_PLAN,
    assertions: [...FOCUSED_BROWSER_SMOKE_PLAN.assertions],
  };
}

function normalizeEvidence(evidence = {}) {
  return {
    appDiffDefined: Boolean(evidence.appDiffDefined),
    appRegistrationDeferred: Boolean(evidence.appRegistrationDeferred),
    appSourceUnchanged: Boolean(evidence.appSourceUnchanged),
    dependencyInjectionDefined: Boolean(evidence.dependencyInjectionDefined),
    focusedBrowserSmokeDefined: Boolean(evidence.focusedBrowserSmokeDefined),
    rollbackGatesDefined: Boolean(evidence.rollbackGatesDefined),
    step363ReadinessAccepted: Boolean(evidence.step363ReadinessAccepted),
    verificationOrderDefined: Boolean(evidence.verificationOrderDefined),
  };
}

export function createNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan({
  evidence = {},
  readinessAudit = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit({
    evidence: {
      appImportSurfaceIdentified: true,
      appRegisterPositionIdentified: true,
      appSourceUnchanged: true,
      dependencyInjectionSourceIdentified: true,
      focusedBrowserCoverageDefined: true,
      producerRuntimesUnchanged: true,
      rollbackPlanDefined: true,
      skeletonUnwired: true,
      step357PlanAccepted: true,
      step358ExecutorAccepted: true,
      step359WiringAuditAccepted: true,
      step360RuntimePlanAccepted: true,
      step361RuntimeContractAccepted: true,
      step362UnwiredSkeletonAccepted: true,
    },
  }),
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    appDiffDefined: normalizedEvidence.appDiffDefined,
    appRegistrationDeferred: normalizedEvidence.appRegistrationDeferred,
    appSourceUnchanged: normalizedEvidence.appSourceUnchanged,
    dependencyInjectionDefined: normalizedEvidence.dependencyInjectionDefined,
    focusedBrowserSmokeDefined: normalizedEvidence.focusedBrowserSmokeDefined,
    ownerBoundaryPreserved: readinessAudit.ownerBoundary === OWNER_BOUNDARY,
    readinessAuditReady: normalizedEvidence.step363ReadinessAccepted && readinessAudit.ready === true,
    rollbackGatesDefined: normalizedEvidence.rollbackGatesDefined,
    runtimeBehaviorUnchanged: true,
    runtimeRegistrationNotImplemented: true,
    verificationOrderDefined: normalizedEvidence.verificationOrderDefined,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    appJsChangesNow: false,
    checks: Object.freeze(checks),
    dependencyInjectionPlan: Object.freeze({
      dispatchCommand: { ...COMMAND_IMPORT_PLAN },
      executor: {
        injectionPolicy: 'use skeleton default executor in app registration',
        source: 'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
      },
      subscribeEvent: {
        importName: 'subscribeEvent',
        source: 'v6/src/runtime/events.js',
      },
    }),
    failed: Object.freeze(failed),
    focusedBrowserSmokePlan: cloneBrowserSmokePlan(),
    forbiddenPlanActions: [...FORBIDDEN_PLAN_ACTIONS],
    id: PLAN_ID,
    minimalAppJsDiffPlan: MINIMAL_APP_JS_DIFF_PLAN.map(cloneDiffStep),
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    ready: failed.length === 0,
    rollbackGates: [...ROLLBACK_GATES],
    runtimeBehaviorChanges: false,
    runtimeRegistrationWired: false,
    selectedNextStep: failed.length
      ? null
      : 'replay-coordination-materialization-runtime-handoff-app-registration',
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
    verificationOrder: [...VERIFICATION_ORDER],
  });
}

export function validateNarrowReplayMaterializationRuntimeHandoffAppRegistrationPlan(plan = {}) {
  const errors = [];
  const diffIds = new Set((plan.minimalAppJsDiffPlan || []).map((step) => step.id));
  const rollbackGates = new Set(plan.rollbackGates || []);
  const verificationOrder = new Set(plan.verificationOrder || []);

  if (plan.id !== PLAN_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'App registration plan id is invalid.' }));
  }
  if (plan.ownerBoundary !== OWNER_BOUNDARY) {
    errors.push(Object.freeze({ field: 'ownerBoundary', message: 'App registration owner boundary changed.' }));
  }
  if (plan.runtimeBehaviorChanges !== false || plan.runtimeRegistrationWired !== false || plan.appJsChangesNow !== false) {
    errors.push(Object.freeze({ field: 'runtimeRegistrationWired', message: 'Step 364 must remain plan-only.' }));
  }
  for (const diffId of [
    'add-dispatch-command-import',
    'add-runtime-factory-import',
    'register-runtime-after-manual-next',
  ]) {
    if (!diffIds.has(diffId)) {
      errors.push(Object.freeze({ field: 'minimalAppJsDiffPlan', message: `Missing app diff step: ${diffId}.` }));
    }
  }
  for (const rollbackGate of ROLLBACK_GATES) {
    if (!rollbackGates.has(rollbackGate)) {
      errors.push(Object.freeze({ field: 'rollbackGates', message: `Missing rollback gate: ${rollbackGate}.` }));
    }
  }
  for (const command of [
    'node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
    'node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
    'node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
    'git diff --check',
  ]) {
    if (!verificationOrder.has(command)) {
      errors.push(Object.freeze({ field: 'verificationOrder', message: `Missing verification command: ${command}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
