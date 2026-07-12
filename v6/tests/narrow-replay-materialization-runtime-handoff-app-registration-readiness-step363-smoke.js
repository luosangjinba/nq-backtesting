import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit,
  createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessReport,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js';

const completeEvidence = Object.freeze({
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
});

const audit = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit({
  evidence: completeEvidence,
});

assert.equal(audit.ready, true);
assert.deepEqual(audit.failed, []);
assert.equal(audit.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(audit.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(audit.appImportSurface.file, 'v6/src/app.js');
assert.equal(audit.appImportSurface.importName, 'createReplayCoordinationMaterializationRuntimeHandoff');
assert.equal(
  audit.appImportSurface.importPath,
  './replay/replay-coordination-materialization-runtime-handoff.js',
);
assert.equal(
  audit.appRegistrationSurface.insertionPoint,
  'after registry.registerRuntime(createChartEntryManualNextRuntime()); before registry.registerRuntime(createChartEntryManualPreviousRuntime());',
);
assert.equal(
  audit.appRegistrationSurface.factoryCall,
  'createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand })',
);
assert.equal(audit.dependencyInjectionSource.subscribeEvent.source, 'v6/src/runtime/events.js');
assert.equal(audit.dependencyInjectionSource.dispatchCommand.source, 'v6/src/runtime/commands.js');
assert.equal(
  audit.dependencyInjectionSource.executor.defaultExportSource,
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
);
assert.deepEqual(audit.rollbackPlan, [
  'remove-runtime-factory-import-from-app',
  'remove-dispatchCommand-import-if-unused',
  'remove-registry-registerRuntime-handoff-call',
  'disable-focused-app-registration-browser-smoke',
  'preserve-unwired-step362-runtime-skeleton',
  'preserve-step358-pure-executor',
]);
assert.deepEqual(audit.focusedBrowserCoverage, [
  'new-replay-coordination-materialization-handoff-app-registration-browser-smoke',
  'display-timeframe-target-materialization-replay-coordination-browser-step337-smoke',
  'target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke',
]);
assert.equal(audit.forbiddenRegistrationActions.includes('register-runtime-in-step363'), true);
assert.equal(audit.forbiddenRegistrationActions.includes('dispatch-command-in-step363'), true);
assert.equal(audit.runtimeBehaviorChanges, false);
assert.equal(audit.runtimeRegistrationReady, true);
assert.equal(audit.runtimeRegistrationWired, false);
assert.equal(audit.sourceReplayCursorAuthority, '1m');
assert.equal(audit.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(
  audit.selectedNextStep,
  'narrow-replay-materialization-runtime-handoff-app-registration-plan',
);

const report = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessReport({
  evidence: completeEvidence,
});
assert.equal(report.status, 'ready');
assert.equal(report.reason, 'app-registration-surfaces-ready-select-plan-before-live-registration');
assert.equal(report.nextStep, 'narrow-replay-materialization-runtime-handoff-app-registration-plan');

const blocked = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessReport({
  evidence: {
    ...completeEvidence,
    appRegisterPositionIdentified: false,
    dependencyInjectionSourceIdentified: false,
    skeletonUnwired: false,
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.reason, 'app-registration-readiness-incomplete-do-not-register-runtime');
assert.equal(blocked.nextStep, null);
assert.deepEqual(blocked.audit.failed, [
  'appRegisterPositionIdentified',
  'dependencyInjectionSourceIdentified',
  'skeletonUnwired',
]);

const wrongOwner = createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit({
  evidence: completeEvidence,
  ownerBoundary: 'runtime.display-timeframe',
});
assert.equal(wrongOwner.ready, false);
assert.equal(wrongOwner.failed.includes('ownerBoundaryPreserved'), true);

console.log('v6 narrow replay materialization runtime handoff app registration readiness step363 smoke passed');
