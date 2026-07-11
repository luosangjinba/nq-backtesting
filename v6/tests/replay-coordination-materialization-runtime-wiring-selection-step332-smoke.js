import assert from 'node:assert/strict';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import {
  auditReplayCoordinationMaterializationRuntimeWiringReadiness,
  selectReplayCoordinationMaterializationRuntimeWiringSlice,
} from '../src/replay/replay-coordination-materialization-runtime-wiring-selection.js';

const plan = createReplayCoordinationMaterializationPureHandoffPlan({
  displayTimeframe: '8h',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: 1780300800,
});

const readyAudit = auditReplayCoordinationMaterializationRuntimeWiringReadiness({ plan });
assert.equal(readyAudit.ready, true);
assert.deepEqual(readyAudit.failed, []);
assert.equal(readyAudit.checks.futureWiringPointSelected, true);
assert.equal(readyAudit.checks.futureWiringPointOwnerReady, true);
assert.equal(readyAudit.checks.noRuntimeWiringYet, true);

const selected = selectReplayCoordinationMaterializationRuntimeWiringSlice({ plan });
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'display-timeframe-target-materialization-readiness-audit');
assert.equal(selected.ownerBoundary, 'display-timeframe-target-materialization-handoff');
assert.equal(selected.reason, 'pure-handoff-plan-ready-select-readiness-audit-before-runtime-wiring');
assert.equal(selected.acceptanceGates.includes('no-runtime-wiring-in-selection-step'), true);
assert.equal(selected.acceptanceGates.includes('target-history-request-sizing-unchanged'), true);
assert.equal(selected.acceptanceGates.includes('chart-history-fast-path-unchanged'), true);

const blocked = selectReplayCoordinationMaterializationRuntimeWiringSlice({
  plan: {
    ...plan,
    futureWiringPoint: {
      id: 'wrong',
      owner: 'chart-history',
      preconditions: [],
    },
    runtimeWiringReady: true,
    sourceReplayCursorAuthority: false,
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.selectedSlice, null);
assert.equal(blocked.reason, 'replay-coordination-materialization-runtime-wiring-readiness-incomplete');
assert.deepEqual(blocked.readiness.failed, [
  'chartDataReplaceSurfacePlanned',
  'futureWiringPointOwnerReady',
  'futureWiringPointSelected',
  'noRuntimeWiringYet',
  'replayCursorAvailablePlanned',
  'sourceReplayCursorAuthority',
  'targetBarRevealPolicyCovered',
  'targetWindowLoadSurfacePlanned',
  'targetWindowPlanSurfacePlanned',
]);

const runtimeOnly = selectReplayCoordinationMaterializationRuntimeWiringSlice({
  candidates: ['display-timeframe-target-materialization-runtime-wiring'],
  plan,
});
assert.equal(runtimeOnly.status, 'blocked');
assert.equal(runtimeOnly.selectedSlice, null);
assert.equal(runtimeOnly.reason, 'readiness-audit-missing-do-not-start-runtime-wiring');

const noCandidate = selectReplayCoordinationMaterializationRuntimeWiringSlice({
  candidates: ['future-target-materialization-telemetry'],
  plan,
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.reason, 'no-replay-coordination-materialization-runtime-wiring-candidate');

const changedTargetHistoryGate = selectReplayCoordinationMaterializationRuntimeWiringSlice({
  chartHistoryFastPathUnchanged: false,
  plan,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedTargetHistoryGate.status, 'blocked');
assert.deepEqual(changedTargetHistoryGate.readiness.failed, [
  'chartHistoryFastPathUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

console.log('v6 replay coordination materialization runtime wiring selection step332 smoke passed');
