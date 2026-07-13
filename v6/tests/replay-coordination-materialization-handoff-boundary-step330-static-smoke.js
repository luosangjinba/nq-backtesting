import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayCoordinationMaterializationOwnerContract } from '../src/replay/replay-coordination-materialization-owner-contract.js';
import { selectReplayCoordinationMaterializationHandoffSlice } from './governance/helpers/replay/replay-coordination-materialization-handoff-slice-selection.js';

const phasePlan = await readFile('v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md', 'utf8');
const step329Doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_OWNER_CONTRACT_STEP329.md', 'utf8');
const handoffSelector = await readFile('v6/tests/governance/helpers/replay/replay-coordination-materialization-handoff-slice-selection.js', 'utf8');
const ownerContract = await readFile('v6/src/replay/replay-coordination-materialization-owner-contract.js', 'utf8');

assert.match(step329Doc, /source `1m` replay state as the cursor authority/);
assert.match(step329Doc, /Step 330 should select the first bounded runtime handoff slice/);
assert.match(step329Doc, /maps target materialization intent to existing bar-data\/chart-data\s+commands/);
assert.match(step329Doc, /without changing replay cursor, no-bar gap, viewport intent, or\s+chart-history fast-path behavior/);

assert.match(phasePlan, /### Phase E - Replay Coordination/);
assert.match(phasePlan, /Display chart updates use target bars when possible/);
assert.match(phasePlan, /No-future filtering uses replay cursor against the target bar's bucket\s+boundary rules/);
assert.match(phasePlan, /target-TF history loading does not move replay cursor or viewport intent/);

const selection = selectReplayCoordinationMaterializationHandoffSlice({
  contract: createReplayCoordinationMaterializationOwnerContract(),
});
assert.equal(selection.status, 'selected');
assert.equal(selection.selectedSlice, 'replay-coordination-materialization-pure-handoff-plan');
assert.equal(selection.reason, 'owner-contract-ready-select-pure-handoff-plan-before-runtime-wiring');
assert.equal(selection.acceptanceGates.includes('no-runtime-wiring-in-selection-step'), true);

assert.match(handoffSelector, /pure-handoff-plan-missing-do-not-start-runtime-wiring/);
assert.match(handoffSelector, /target-history-request-sizing-unchanged/);
assert.match(handoffSelector, /chart-history-fast-path-unchanged/);
assert.match(handoffSelector, /no-runtime-wiring-in-selection-step/);
assert.match(ownerContract, /readOnlyContractReady: true/);
assert.match(ownerContract, /runtimeWiringReady: false/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_HISTORY_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'fetch(',
  'localStorage',
  'XMLHttpRequest',
  'setData(',
  'setVisibleLogicalRange',
]) {
  assert.equal(handoffSelector.includes(forbiddenToken), false, `handoff slice selector must not expose ${forbiddenToken}`);
}

console.log('v6 replay coordination materialization handoff boundary step330 static smoke passed');
