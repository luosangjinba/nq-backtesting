import assert from 'node:assert/strict';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import {
  auditDisplayTimeframeTargetMaterializationReadiness,
  createDisplayTimeframeTargetMaterializationReadinessReport,
} from './governance/helpers/replay/display-timeframe-target-materialization-readiness-audit.js';

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

const plan = createReplayCoordinationMaterializationPureHandoffPlan({
  displayTimeframe: '8h',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: 1780300800,
});

const ready = auditDisplayTimeframeTargetMaterializationReadiness({
  plan,
  surfaces: readySurfaces,
});
assert.equal(ready.ready, true);
assert.equal(ready.status, 'ready-for-runtime-wiring-selection');
assert.deepEqual(ready.failed, []);
assert.deepEqual(ready.missingSurfaces, []);
assert.deepEqual(ready.missingGates, []);
assert.equal(ready.ownerSurfaceMappingReady, true);
assert.equal(ready.futureWiringPointReady, true);
assert.equal(ready.planValidation.valid, true);

const readyReport = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan,
  surfaces: readySurfaces,
});
assert.equal(readyReport.status, 'ready');
assert.equal(readyReport.reason, 'display-timeframe-target-materialization-owner-surfaces-ready');
assert.equal(readyReport.nextSlice, 'display-timeframe-target-materialization-wiring-plan');
assert.equal(readyReport.ownerBoundary, 'display-timeframe-target-materialization-handoff');

const missingSurface = auditDisplayTimeframeTargetMaterializationReadiness({
  plan,
  surfaces: {
    ...readySurfaces,
    chartDataReplaceSurface: false,
    replayCursorReadSurface: false,
  },
});
assert.equal(missingSurface.ready, false);
assert.deepEqual(missingSurface.missingSurfaces, [
  'chartDataReplaceSurface',
  'replayCursorReadSurface',
]);
assert.deepEqual(missingSurface.failed, [
  'chartDataReplaceSurface',
  'replayCursorReadSurface',
]);

const missingGate = auditDisplayTimeframeTargetMaterializationReadiness({
  gates: {
    'chart-history-fast-path-unchanged': false,
    'target-history-request-sizing-unchanged': false,
  },
  plan,
  surfaces: readySurfaces,
});
assert.equal(missingGate.ready, false);
assert.deepEqual(missingGate.missingGates, [
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
]);

const invalidPlan = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan: {
    ...plan,
    futureWiringPoint: { id: 'wrong', owner: 'chart-history', preconditions: [] },
    ownerSurfaces: [],
  },
  surfaces: readySurfaces,
});
assert.equal(invalidPlan.status, 'blocked');
assert.equal(invalidPlan.audit.futureWiringPointReady, false);
assert.equal(invalidPlan.audit.ownerSurfaceMappingReady, false);
assert.deepEqual(invalidPlan.audit.failed, [
  'pureHandoffPlanValid',
  'futureWiringPointReady',
  'ownerSurfaceMappingReady',
]);

console.log('v6 display timeframe target materialization readiness audit step333 smoke passed');
