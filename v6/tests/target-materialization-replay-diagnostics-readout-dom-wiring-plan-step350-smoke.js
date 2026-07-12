import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan,
  getTargetMaterializationReplayDiagnosticsReadoutDomConsumptionSequence,
  getTargetMaterializationReplayDiagnosticsReadoutDomContainer,
  getTargetMaterializationReplayDiagnosticsReadoutDomDatasetAttributes,
  getTargetMaterializationReplayDiagnosticsReadoutDomForbiddenActions,
  getTargetMaterializationReplayDiagnosticsReadoutDomRenderingRules,
  getTargetMaterializationReplayDiagnosticsReadoutDomRollbackCriteria,
  getTargetMaterializationReplayDiagnosticsReadoutDomWiringOwner,
  getTargetMaterializationReplayDiagnosticsReadoutDomWiringPlanId,
  validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan,
} from '../src/shell/target-materialization-replay-diagnostics-readout-dom-wiring-plan.js';

assert.equal(
  getTargetMaterializationReplayDiagnosticsReadoutDomWiringPlanId(),
  'target-materialization-replay-diagnostics-readout-dom-wiring-plan',
);
assert.equal(getTargetMaterializationReplayDiagnosticsReadoutDomWiringOwner(), 'shell.pane-status-readout');

assert.deepEqual(getTargetMaterializationReplayDiagnosticsReadoutDomContainer(), {
  containerSelector: '[data-v6-pane-status-readout]',
  insertionPoint: 'after [data-v6-target-history-diagnostics]',
  readoutSelector: '[data-v6-target-materialization-diagnostics]',
  rowSelector: '[data-v6-target-materialization-diagnostics-row]',
  template: 'span.target-materialization-diagnostics-readout',
});

assert.deepEqual(getTargetMaterializationReplayDiagnosticsReadoutDomDatasetAttributes(), [
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-mode',
  'data-v6-target-materialization-diagnostics-reason',
  'data-v6-target-materialization-diagnostics-pane-id',
  'data-v6-target-materialization-diagnostics-snapshot-ready',
  'data-v6-target-materialization-diagnostics-row',
  'data-v6-target-materialization-diagnostics-field',
  'data-v6-target-materialization-diagnostics-value',
]);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsReadoutDomConsumptionSequence().map((step) => step.id),
  ['mount-pane-local-readout-containers', 'read-current-snapshot', 'refresh-on-snapshot-ready'],
);
assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsReadoutDomConsumptionSequence()
    .filter((step) => step.routesThrough)
    .map((step) => step.routesThrough),
  [
    'target-materialization-replay-diagnostics-readout-view-model',
    'target-materialization-replay-diagnostics-readout-view-model',
  ],
);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsReadoutDomRenderingRules(), [
  'hidden-view-model-removes-row-content-and-sets-hidden-mode',
  'collapsed-view-model-renders-first-visible-fields-only',
  'internal-only-fields-are-never-rendered-as-rows',
  'pane-id-mismatch-does-not-render-into-other-pane',
  'missing-container-skips-render-without-runtime-side-effects',
]);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsReadoutDomRollbackCriteria(), [
  'pane-status-readout-layout-overlaps-chart-ohlc',
  'diagnostics-readout-causes-app-shell-browser-smoke-regression',
  'shell-code-calls-target-bars-api',
  'shell-code-dispatches-updateSnapshot',
  'producer-runtime-imports-diagnostics-commands',
  'view-model-exposes-internal-only-fields',
]);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsReadoutDomForbiddenActions(),
  [
    'call target bars API',
    'dispatch targetMaterializationReplayDiagnostics.updateSnapshot',
    'dispatch replay.next',
    'dispatch replay.setCursorTime',
    'dispatch barData.planTargetWindow',
    'dispatch barData.loadTargetWindow',
    'dispatch chartData.replaceBars',
    'dispatch chartData.appendBars',
    'dispatch chartViewport.resetView',
    'write chart engine series directly',
    'change target-history request sizing',
    'change chart-history fast-path delay policy',
    'modify Display-Timeframe Runtime',
    'modify Manual Next Runtime',
    'modify Auto Play Runtime',
  ],
);

const plan = createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan();
assert.equal(plan.id, 'target-materialization-replay-diagnostics-readout-dom-wiring-plan');
assert.equal(plan.owner, 'shell.pane-status-readout');
assert.equal(plan.viewModelId, 'target-materialization-replay-diagnostics-readout-view-model');
assert.equal(plan.domVisibleUiWired, false);
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);
assert.equal(Object.isFrozen(plan), true);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan(plan), {
  errors: [],
  valid: true,
});

const invalid = validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan({
  ...plan,
  consumptionSequence: [],
  datasetAttributes: [],
  domContainer: { containerSelector: 'body', insertionPoint: 'footer' },
  domVisibleUiWired: true,
  forbiddenActions: [],
  id: 'bad',
  owner: 'workstation-shell',
  renderingRules: [],
  rollbackCriteria: [],
  runtimeBehaviorChanges: true,
  targetHistoryRequestSizingUnchanged: false,
  viewModelId: 'bad-view-model',
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.length > 25);
assert.ok(invalid.errors.some((error) => error.message.includes('getSnapshot')));
assert.ok(invalid.errors.some((error) => error.message.includes('snapshotReady')));
assert.ok(invalid.errors.some((error) => error.message.includes('Step 349 view model')));

console.log('v6 target materialization replay diagnostics readout dom wiring plan step350 smoke passed');
