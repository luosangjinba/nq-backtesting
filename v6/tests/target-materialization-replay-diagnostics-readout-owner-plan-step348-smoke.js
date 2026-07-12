import assert from 'node:assert/strict';
import {
  createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan,
  getTargetMaterializationReplayDiagnosticsConsumptionSequence,
  getTargetMaterializationReplayDiagnosticsFirstVisibleFields,
  getTargetMaterializationReplayDiagnosticsInternalOnlyFields,
  getTargetMaterializationReplayDiagnosticsReadoutForbiddenActions,
  getTargetMaterializationReplayDiagnosticsReadoutOwner,
  getTargetMaterializationReplayDiagnosticsReadoutPlanId,
  getTargetMaterializationReplayDiagnosticsVisibilityRules,
  validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan,
} from '../src/replay/target-materialization-replay-diagnostics-readout-owner-plan.js';

assert.equal(
  getTargetMaterializationReplayDiagnosticsReadoutPlanId(),
  'target-materialization-replay-diagnostics-readout-owner-plan',
);
assert.equal(getTargetMaterializationReplayDiagnosticsReadoutOwner(), 'shell.pane-status-readout');

assert.deepEqual(getTargetMaterializationReplayDiagnosticsFirstVisibleFields(), [
  'displayTimeframe',
  'targetHistoryStatus',
  'projectionOwner',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
]);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsInternalOnlyFields(), [
  'paneId',
  'sourceCursorTime',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
  'latestDisplayTimestamp',
  'targetHistoryReason',
  'displayApplyStatus',
]);

assert.deepEqual(getTargetMaterializationReplayDiagnosticsVisibilityRules(), [
  'hidden-by-default-for-normal-replay',
  'collapsed-unless-target-history-active-or-fallback',
  'pane-local-only',
  'show-only-when-diagnostics-snapshot-ready',
  'no-expanded-diagnostics-during-order-ticket-or-journal-workflows',
]);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsConsumptionSequence().map((step) => step.id),
  ['read-current-diagnostics-snapshot', 'refresh-on-snapshot-ready'],
);

assert.deepEqual(
  getTargetMaterializationReplayDiagnosticsReadoutForbiddenActions(),
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
  ],
);

const plan = createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan();
assert.equal(plan.id, 'target-materialization-replay-diagnostics-readout-owner-plan');
assert.equal(plan.owner, 'shell.pane-status-readout');
assert.equal(plan.placement.mode, 'developer-collapsed-pane-status-readout');
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.shellVisibleUiReady, false);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);
assert.equal(plan.chartHistoryFastPathUnchanged, true);
assert.equal(Object.isFrozen(plan), true);
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan(plan), {
  errors: [],
  valid: true,
});

const invalidPlan = validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan({
  ...plan,
  chartHistoryFastPathUnchanged: false,
  consumptionSequence: [],
  firstVisibleFields: ['sourceCursorAuthority'],
  forbiddenActions: [],
  id: 'bad',
  internalOnlyFields: [],
  owner: 'display-timeframe-runtime',
  placement: { mode: 'always-visible-footer' },
  runtimeBehaviorChanges: true,
  shellVisibleUiReady: true,
  targetBarsDisplayMaterializationInputOnly: false,
  targetHistoryRequestSizingUnchanged: false,
  visibilityRules: [],
});
assert.equal(invalidPlan.valid, false);
assert.ok(invalidPlan.errors.length > 20);
assert.ok(invalidPlan.errors.some((error) => error.message.includes('getSnapshot')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('snapshotReady')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('sourceCursorAuthority')));

console.log('v6 target materialization replay diagnostics readout owner plan step348 smoke passed');
