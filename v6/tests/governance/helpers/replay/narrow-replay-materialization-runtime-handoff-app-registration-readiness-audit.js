const AUDIT_ID = 'narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';
const RUNTIME_FACTORY = 'createReplayCoordinationMaterializationRuntimeHandoff';

const APP_IMPORT_SURFACE = Object.freeze({
  file: 'v6/src/app.js',
  importName: RUNTIME_FACTORY,
  importPath: './replay/replay-coordination-materialization-runtime-handoff.js',
  placement: 'after createTargetMaterializationReplayDiagnosticsRuntime import',
});

const APP_REGISTRATION_SURFACE = Object.freeze({
  file: 'v6/src/app.js',
  factoryCall: 'createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand })',
  insertionPoint: 'after registry.registerRuntime(createChartEntryManualNextRuntime()); before registry.registerRuntime(createChartEntryManualPreviousRuntime());',
  runtimeId: OWNER_BOUNDARY,
  startupOrderReason: 'manual-next-advanced event is produced before replay coordination handoff consumes it, and autoplay/manual-previous remain downstream unchanged',
});

const DEPENDENCY_INJECTION_SOURCE = Object.freeze({
  dispatchCommand: Object.freeze({
    appImport: "import { dispatchCommand } from './runtime/commands.js';",
    source: 'v6/src/runtime/commands.js',
  }),
  executor: Object.freeze({
    defaultExportSource: 'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
    injectionPolicy: 'use skeleton default unless a focused test injects an override',
  }),
  subscribeEvent: Object.freeze({
    appImport: "import { emitEvent, subscribeEvent } from './runtime/events.js';",
    source: 'v6/src/runtime/events.js',
  }),
});

const FOCUSED_BROWSER_COVERAGE = Object.freeze([
  'new-replay-coordination-materialization-handoff-app-registration-browser-smoke',
  'display-timeframe-target-materialization-replay-coordination-browser-step337-smoke',
  'target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke',
]);

const ROLLBACK_PLAN = Object.freeze([
  'remove-runtime-factory-import-from-app',
  'remove-dispatchCommand-import-if-unused',
  'remove-registry-registerRuntime-handoff-call',
  'disable-focused-app-registration-browser-smoke',
  'preserve-unwired-step362-runtime-skeleton',
  'preserve-step358-pure-executor',
]);

const FORBIDDEN_REGISTRATION_ACTIONS = Object.freeze([
  'modify-app-js-in-step363',
  'register-runtime-in-step363',
  'register-command-in-step363',
  'subscribe-event-in-step363',
  'dispatch-command-in-step363',
  'modify-producer-runtimes',
  'route-target-bars-through-replay-runtime',
]);

function cloneSurface(surface) {
  return { ...surface };
}

function cloneDependencyInjectionSource() {
  return {
    dispatchCommand: { ...DEPENDENCY_INJECTION_SOURCE.dispatchCommand },
    executor: { ...DEPENDENCY_INJECTION_SOURCE.executor },
    subscribeEvent: { ...DEPENDENCY_INJECTION_SOURCE.subscribeEvent },
  };
}

function normalizeEvidence(evidence = {}) {
  return {
    appImportSurfaceIdentified: Boolean(evidence.appImportSurfaceIdentified),
    appRegisterPositionIdentified: Boolean(evidence.appRegisterPositionIdentified),
    appSourceUnchanged: Boolean(evidence.appSourceUnchanged),
    dependencyInjectionSourceIdentified: Boolean(evidence.dependencyInjectionSourceIdentified),
    focusedBrowserCoverageDefined: Boolean(evidence.focusedBrowserCoverageDefined),
    producerRuntimesUnchanged: Boolean(evidence.producerRuntimesUnchanged),
    rollbackPlanDefined: Boolean(evidence.rollbackPlanDefined),
    skeletonUnwired: Boolean(evidence.skeletonUnwired),
    step357PlanAccepted: Boolean(evidence.step357PlanAccepted),
    step358ExecutorAccepted: Boolean(evidence.step358ExecutorAccepted),
    step359WiringAuditAccepted: Boolean(evidence.step359WiringAuditAccepted),
    step360RuntimePlanAccepted: Boolean(evidence.step360RuntimePlanAccepted),
    step361RuntimeContractAccepted: Boolean(evidence.step361RuntimeContractAccepted),
    step362UnwiredSkeletonAccepted: Boolean(evidence.step362UnwiredSkeletonAccepted),
  };
}

export function createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit({
  evidence = {},
  ownerBoundary = OWNER_BOUNDARY,
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    appImportSurfaceIdentified: normalizedEvidence.appImportSurfaceIdentified,
    appRegisterPositionIdentified: normalizedEvidence.appRegisterPositionIdentified,
    appSourceUnchanged: normalizedEvidence.appSourceUnchanged,
    dependencyInjectionSourceIdentified: normalizedEvidence.dependencyInjectionSourceIdentified,
    focusedBrowserCoverageDefined: normalizedEvidence.focusedBrowserCoverageDefined,
    ownerBoundaryPreserved: ownerBoundary === OWNER_BOUNDARY,
    producerRuntimesUnchanged: normalizedEvidence.producerRuntimesUnchanged,
    rollbackPlanDefined: normalizedEvidence.rollbackPlanDefined,
    runtimeBehaviorUnchanged: true,
    runtimeRegistrationNotImplemented: true,
    skeletonUnwired: normalizedEvidence.skeletonUnwired,
    step357PlanAccepted: normalizedEvidence.step357PlanAccepted,
    step358ExecutorAccepted: normalizedEvidence.step358ExecutorAccepted,
    step359WiringAuditAccepted: normalizedEvidence.step359WiringAuditAccepted,
    step360RuntimePlanAccepted: normalizedEvidence.step360RuntimePlanAccepted,
    step361RuntimeContractAccepted: normalizedEvidence.step361RuntimeContractAccepted,
    step362UnwiredSkeletonAccepted: normalizedEvidence.step362UnwiredSkeletonAccepted,
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    appImportSurface: cloneSurface(APP_IMPORT_SURFACE),
    appRegistrationSurface: cloneSurface(APP_REGISTRATION_SURFACE),
    checks: Object.freeze(checks),
    dependencyInjectionSource: cloneDependencyInjectionSource(),
    failed: Object.freeze(failed),
    focusedBrowserCoverage: [...FOCUSED_BROWSER_COVERAGE],
    forbiddenRegistrationActions: [...FORBIDDEN_REGISTRATION_ACTIONS],
    id: AUDIT_ID,
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    ready: failed.length === 0,
    rollbackPlan: [...ROLLBACK_PLAN],
    runtimeBehaviorChanges: false,
    runtimeRegistrationReady: failed.length === 0,
    runtimeRegistrationWired: false,
    selectedNextStep: failed.length
      ? null
      : 'narrow-replay-materialization-runtime-handoff-app-registration-plan',
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
  });
}

export function createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessReport(input = {}) {
  const audit = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit(input);
  return Object.freeze({
    audit,
    nextStep: audit.selectedNextStep,
    ownerBoundary: audit.ownerBoundary,
    reason: audit.ready
      ? 'app-registration-surfaces-ready-select-plan-before-live-registration'
      : 'app-registration-readiness-incomplete-do-not-register-runtime',
    status: audit.ready ? 'ready' : 'blocked',
  });
}
