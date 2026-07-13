import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayCoordinationMaterializationOwnerContract } from '../src/replay/replay-coordination-materialization-owner-contract.js';
import { selectReplayCoordinationMaterializationTransitionSlice } from './governance/helpers/replay/replay-coordination-materialization-transition-selection.js';

const architecture = await readFile('v6/docs/V6_ARCHITECTURE.md', 'utf8');
const phasePlan = await readFile('v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md', 'utf8');
const step328Doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_TRANSITION_SELECTION_STEP328.md', 'utf8');
const contractSource = await readFile('v6/src/replay/replay-coordination-materialization-owner-contract.js', 'utf8');
const revealPolicySource = await readFile('v6/src/materialization/target-bar-reveal-policy.js', 'utf8');
const selectorSource = await readFile('v6/tests/governance/helpers/replay/replay-coordination-materialization-transition-selection.js', 'utf8');

assert.match(step328Doc, /replay-coordination-materialization-owner-contract/);
assert.match(step328Doc, /Replay Runtime owns cursor and reveal state/);
assert.match(step328Doc, /Chart Data Runtime owns pane-local display bars and no-future filtering/);
assert.match(step328Doc, /chart-history fast path and target-history request sizing should stay\s+unchanged/);

assert.match(phasePlan, /### Phase E - Replay Coordination/);
assert.match(phasePlan, /Manual Next and auto-play continue advancing on source `1m` availability/);
assert.match(phasePlan, /No-future filtering uses replay cursor against the target bar's bucket\s+boundary rules/);
assert.match(phasePlan, /target-TF history loading does not move replay cursor or viewport intent/);

assert.match(architecture, /### Replay Runtime[\s\S]*Forbidden:[\s\S]*bar-data API calls outside bar runtime;/);
assert.match(architecture, /### Bar Data Runtime[\s\S]*Forbidden:[\s\S]*replay cursor mutation;/);
assert.match(architecture, /### Chart Data Runtime[\s\S]*no-future bar filtering before chart render input/);
assert.match(architecture, /### Chart Viewport Runtime[\s\S]*Forbidden:[\s\S]*requesting bars;/);

const transition = selectReplayCoordinationMaterializationTransitionSlice({
  fastPathRemeasurement: { status: 'materialization-ready' },
});
assert.equal(transition.selectedSlice, 'replay-coordination-materialization-owner-contract');

const contract = createReplayCoordinationMaterializationOwnerContract();
assert.equal(contract.owner, 'replay-coordination-materialization-contract');
assert.equal(contract.readOnlyContractReady, true);
assert.equal(contract.runtimeWiringReady, false);
assert.equal(contract.materializationRuntimeReady, false);
assert.equal(contract.writeReady, false);
assert.equal(contract.acceptanceGates.includes('source-1m-replay-cursor-authority'), true);
assert.equal(contract.acceptanceGates.includes('target-bars-display-materialization-input-only'), true);

assert.match(selectorSource, /replay-coordination-materialization-owner-contract/);
assert.match(contractSource, /resolveReplayCoordinationTargetBarRevealState/);
assert.match(contractSource, /resolveTargetBarRevealState/);
assert.match(revealPolicySource, /target-bar-complete-before-or-at-source-cursor/);
assert.match(revealPolicySource, /source-cursor-inside-target-bucket/);
assert.match(contractSource, /source-1m-replay-cursor-authority/);

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
  assert.equal(contractSource.includes(forbiddenToken), false, `materialization owner contract must not expose ${forbiddenToken}`);
}

console.log('v6 replay coordination materialization owner contract boundary step329 static smoke passed');
