import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit,
  createNarrowReplayMaterializationRuntimeHandoffWiringReadinessReport,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-wiring-readiness-audit.js';

const completeEvidence = Object.freeze({
  appRegistrySurfaceAvailable: true,
  commandDispatchWrapperShapeDefined: true,
  eventSubscriptionSurfaceAvailable: true,
  executorAvailable: true,
  noProducerRuntimeChanges: true,
  rollbackCriteriaDefined: true,
  step357PlanAccepted: true,
  step358ExecutorAccepted: true,
});

const audit = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit({
  evidence: completeEvidence,
});
assert.equal(audit.ready, true);
assert.deepEqual(audit.failed, []);
assert.equal(audit.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(audit.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(audit.appRegistrationSurface.file, 'v6/src/app.js');
assert.equal(audit.appRegistrationSurface.insertionPoint, 'runtime registry before lifecycle start');
assert.equal(audit.appRegistrationSurface.runtimeFactory, 'createReplayCoordinationMaterializationRuntimeHandoff');
assert.equal(audit.eventSubscriptionSurface.eventSurface, 'chartEntryManualNext:advanced');
assert.equal(audit.eventSubscriptionSurface.placement, 'runtime start lifecycle');
assert.equal(audit.commandDispatchWrapper.shape, 'runtime-command-dispatch-wrapper-with-injected-results');
assert.deepEqual(audit.commandDispatchWrapper.commandSurfaces, [
  'pane.getById',
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
  'chartData.replaceBars',
]);
assert.deepEqual(audit.rollbackCriteria, [
  'remove-app-runtime-registration',
  'remove-manual-next-advanced-subscription',
  'disable-command-dispatch-wrapper',
  'preserve-step358-pure-executor',
  'preserve-step357-plan',
]);
assert.equal(audit.forbiddenWiringActions.includes('modify-manual-next-runtime'), true);
assert.equal(audit.forbiddenWiringActions.includes('route-target-bars-through-replay-runtime'), true);
assert.equal(audit.runtimeBehaviorChanges, false);
assert.equal(audit.runtimeWiringReady, false);
assert.equal(audit.sourceReplayCursorAuthority, '1m');
assert.equal(audit.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(audit.selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-plan');

const report = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessReport({
  evidence: completeEvidence,
});
assert.equal(report.status, 'ready');
assert.equal(report.reason, 'wiring-surfaces-ready-select-runtime-plan-before-live-wiring');
assert.equal(report.nextStep, 'narrow-replay-materialization-runtime-handoff-runtime-plan');

const blocked = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessReport({
  evidence: {
    ...completeEvidence,
    appRegistrySurfaceAvailable: false,
    commandDispatchWrapperShapeDefined: false,
    executorAvailable: false,
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.reason, 'wiring-readiness-incomplete-do-not-wire-runtime');
assert.equal(blocked.nextStep, null);
assert.deepEqual(blocked.audit.failed, [
  'appRegistrySurfaceAvailable',
  'commandDispatchWrapperShapeDefined',
  'executorAvailable',
]);

const wrongOwner = createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit({
  evidence: completeEvidence,
  plan: {
    ownerBoundary: 'runtime.display-timeframe',
  },
});
assert.equal(wrongOwner.ready, false);
assert.equal(wrongOwner.failed.includes('ownerBoundaryPreserved'), true);

console.log('v6 narrow replay materialization runtime handoff wiring readiness step359 smoke passed');
