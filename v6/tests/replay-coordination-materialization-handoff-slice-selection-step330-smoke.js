import assert from 'node:assert/strict';
import { createReplayCoordinationMaterializationOwnerContract } from '../src/replay/replay-coordination-materialization-owner-contract.js';
import {
  auditReplayCoordinationMaterializationHandoffReadiness,
  selectReplayCoordinationMaterializationHandoffSlice,
} from './governance/helpers/replay/replay-coordination-materialization-handoff-slice-selection.js';

const contract = createReplayCoordinationMaterializationOwnerContract();
const readyAudit = auditReplayCoordinationMaterializationHandoffReadiness({ contract });
assert.equal(readyAudit.ready, true);
assert.deepEqual(readyAudit.failed, []);
assert.equal(readyAudit.checks.readOnlyContractReady, true);
assert.equal(readyAudit.checks.replaySource1mDriven, true);
assert.equal(readyAudit.checks.noRuntimeWiringYet, true);

const selected = selectReplayCoordinationMaterializationHandoffSlice({ contract });
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'replay-coordination-materialization-pure-handoff-plan');
assert.equal(selected.ownerBoundary, 'replay-coordination-materialization-runtime-handoff');
assert.equal(selected.reason, 'owner-contract-ready-select-pure-handoff-plan-before-runtime-wiring');
assert.equal(selected.acceptanceGates.includes('no-runtime-wiring-in-selection-step'), true);
assert.equal(selected.acceptanceGates.includes('target-history-request-sizing-unchanged'), true);
assert.equal(selected.acceptanceGates.includes('chart-history-fast-path-unchanged'), true);

const blockedContract = selectReplayCoordinationMaterializationHandoffSlice({
  contract: {
    ...contract,
    readOnlyContractReady: false,
    replaySourceTimeframe: 5,
    runtimeWiringReady: true,
  },
});
assert.equal(blockedContract.status, 'blocked');
assert.equal(blockedContract.selectedSlice, null);
assert.equal(blockedContract.reason, 'replay-coordination-materialization-handoff-readiness-incomplete');
assert.deepEqual(blockedContract.readiness.failed, [
  'noRuntimeWiringYet',
  'readOnlyContractReady',
  'replaySource1mDriven',
]);

const runtimeOnly = selectReplayCoordinationMaterializationHandoffSlice({
  candidates: ['replay-coordination-materialization-runtime-wiring'],
  contract,
});
assert.equal(runtimeOnly.status, 'blocked');
assert.equal(runtimeOnly.selectedSlice, null);
assert.equal(runtimeOnly.reason, 'pure-handoff-plan-missing-do-not-start-runtime-wiring');

const noCandidate = selectReplayCoordinationMaterializationHandoffSlice({
  candidates: ['future-materialization-telemetry'],
  contract,
});
assert.equal(noCandidate.status, 'blocked');
assert.equal(noCandidate.selectedSlice, null);
assert.equal(noCandidate.reason, 'no-replay-coordination-materialization-handoff-candidate');

const changedTargetHistoryGate = selectReplayCoordinationMaterializationHandoffSlice({
  contract,
  fastPathUnchanged: false,
  targetHistoryRequestSizingUnchanged: false,
});
assert.equal(changedTargetHistoryGate.status, 'blocked');
assert.deepEqual(changedTargetHistoryGate.readiness.failed, [
  'chartHistoryFastPathUnchanged',
  'targetHistoryRequestSizingUnchanged',
]);

console.log('v6 replay coordination materialization handoff slice selection step330 smoke passed');
