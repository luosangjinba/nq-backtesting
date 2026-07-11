import assert from 'node:assert/strict';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import { createDisplayTimeframeTargetMaterializationReadinessReport } from '../src/replay/display-timeframe-target-materialization-readiness-audit.js';
import {
  createDisplayTimeframeTargetMaterializationWiringPlan,
  getDisplayTimeframeTargetMaterializationWiringCommandSequence,
  getDisplayTimeframeTargetMaterializationWiringFallbackGates,
  getDisplayTimeframeTargetMaterializationWiringForbiddenActions,
  getDisplayTimeframeTargetMaterializationWiringOwner,
  getDisplayTimeframeTargetMaterializationWiringPlanId,
  getDisplayTimeframeTargetMaterializationWiringRollbackCriteria,
  validateDisplayTimeframeTargetMaterializationWiringPlan,
} from '../src/replay/display-timeframe-target-materialization-wiring-plan.js';

const readySurfaces = {
  barDataTargetLoadSurface: true,
  barDataTargetPlanSurface: true,
  chartDataReplaceSurface: true,
  chartDataSourcePreservationSurface: true,
  displayTimeframeApplySurface: true,
  displayTimeframeTargetHistoryBranch: true,
  replayCursorReadSurface: true,
  targetBarRevealPolicySurface: true,
};

const pureHandoffPlan = createReplayCoordinationMaterializationPureHandoffPlan({
  displayTimeframe: '8h',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: 1780300800,
  targetHistoryEnd: '2026-06-02 16:00',
  targetHistoryStart: '2026-06-01 18:00',
});

const readinessReport = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan: pureHandoffPlan,
  surfaces: readySurfaces,
});

assert.equal(getDisplayTimeframeTargetMaterializationWiringPlanId(), 'display-timeframe-target-materialization-wiring-plan');
assert.equal(getDisplayTimeframeTargetMaterializationWiringOwner(), 'display-timeframe-runtime');

assert.deepEqual(
  getDisplayTimeframeTargetMaterializationWiringCommandSequence().map((step) => step.id),
  [
    'read-source-replay-cursor',
    'preserve-source-bars',
    'plan-target-window',
    'load-target-window',
    'resolve-target-bar-reveal-state',
    'replace-display-bars',
    'reapply-existing-viewport-intent',
  ],
);

assert.deepEqual(
  getDisplayTimeframeTargetMaterializationWiringCommandSequence()
    .map((step) => step.commandSurface)
    .filter(Boolean),
  [
    'replay.getState',
    'chartData.getSourceBars',
    'barData.planTargetWindow',
    'barData.loadTargetWindow',
    'chartData.replaceBars',
  ],
);

assert.deepEqual(getDisplayTimeframeTargetMaterializationWiringFallbackGates(), [
  'readiness-report-ready',
  'target-history-enabled-for-display-timeframe',
  'source-1m-replay-cursor-readable',
  'source-bars-preserved-before-target-replacement',
  'target-window-plan-created',
  'target-window-load-returned-bars',
  'target-bar-reveal-policy-resolved',
  'chart-data-replace-accepts-preserve-source',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
]);

assert.deepEqual(getDisplayTimeframeTargetMaterializationWiringRollbackCriteria(), [
  'runtime-wiring-mutates-replay-cursor',
  'runtime-wiring-mutates-viewport-intent-directly',
  'runtime-wiring-writes-chart-engine-directly',
  'target-load-latency-regresses-high-timeframe-history-pack',
  'switching-back-to-1m-loses-source-bars',
  'target-bar-reveal-policy-allows-future-bars',
]);

assert.deepEqual(getDisplayTimeframeTargetMaterializationWiringForbiddenActions(), [
  'dispatch replay.next',
  'dispatch replay.previous',
  'dispatch replay.setCursorTime',
  'dispatch chartViewport.resetView',
  'dispatch chartViewport.setManualIntent',
  'call chart-engine setData directly',
  'call chart-engine setVisibleLogicalRange directly',
  'change target-history request sizing',
  'change chart-history fast-path delay policy',
]);

const plan = createDisplayTimeframeTargetMaterializationWiringPlan({ readinessReport });
assert.equal(plan.id, 'display-timeframe-target-materialization-wiring-plan');
assert.equal(plan.owner, 'display-timeframe-runtime');
assert.equal(plan.runtimeWiringAllowed, true);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.preservesSourceReplayCursorAuthority, true);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);
assert.equal(plan.chartHistoryFastPathUnchanged, true);
assert.equal(Object.isFrozen(plan), true);
assert.deepEqual(validateDisplayTimeframeTargetMaterializationWiringPlan(plan), { errors: [], valid: true });

const blockedReport = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan: pureHandoffPlan,
  surfaces: {
    ...readySurfaces,
    chartDataReplaceSurface: false,
  },
});
const blockedPlan = createDisplayTimeframeTargetMaterializationWiringPlan({ readinessReport: blockedReport });
assert.equal(blockedPlan.runtimeWiringAllowed, false);
const blockedValidation = validateDisplayTimeframeTargetMaterializationWiringPlan(blockedPlan);
assert.equal(blockedValidation.valid, false);
assert.deepEqual(blockedValidation.errors.map((error) => error.field), ['runtimeWiringAllowed']);

const invalidPlan = validateDisplayTimeframeTargetMaterializationWiringPlan({
  ...plan,
  commandSequence: [],
  fallbackGates: [],
  forbiddenActions: [],
  id: 'bad',
  owner: 'chart-history',
  preservesSourceReplayCursorAuthority: false,
  rollbackCriteria: [],
  runtimeBehaviorChanges: true,
  runtimeWiringAllowed: false,
  runtimeWiringReady: true,
  targetBarsDisplayMaterializationInputOnly: false,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(invalidPlan.valid, false);
assert.ok(invalidPlan.errors.length > 20);
assert.ok(invalidPlan.errors.some((error) => error.message.includes('chartData.replaceBars')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('runtime-wiring-mutates-replay-cursor')));
assert.ok(invalidPlan.errors.some((error) => error.message.includes('dispatch replay.next')));

console.log('v6 display timeframe target materialization wiring plan step334 smoke passed');
