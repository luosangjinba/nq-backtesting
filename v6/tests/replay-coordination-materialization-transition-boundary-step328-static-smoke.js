import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectReplayCoordinationMaterializationTransitionSlice } from '../src/replay/replay-coordination-materialization-transition-selection.js';

const architecture = await readFile('v6/docs/V6_ARCHITECTURE.md', 'utf8');
const phasePlan = await readFile('v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md', 'utf8');
const step327Doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_FAST_PATH_REMEASUREMENT_STEP327.md', 'utf8');
const selector = await readFile('v6/src/replay/replay-coordination-materialization-transition-selection.js', 'utf8');

assert.match(step327Doc, /status: `materialization-ready`/);
assert.match(step327Doc, /next slice: `replay-coordination-materialization-transition`/);
assert.match(step327Doc, /Replay remains source `1m` driven/);

assert.match(phasePlan, /### Phase D - Display-Timeframe Historical Path/);
assert.match(phasePlan, /### Phase E - Replay Coordination/);
assert.match(phasePlan, /Manual Next and auto-play continue advancing on source `1m` availability/);
assert.match(phasePlan, /target-TF history loading does not move replay cursor or viewport intent/);

assert.match(architecture, /### Replay Runtime[\s\S]*replay cursor;[\s\S]*revealed count\/range;/);
assert.match(architecture, /### Bar Data Runtime[\s\S]*V4 bars API usage;[\s\S]*loaded windows;/);
assert.match(architecture, /### Chart Viewport Runtime[\s\S]*viewport intent per pane through one pane model;/);
assert.match(architecture, /### Chart Data Runtime[\s\S]*pane-local chart bar set;/);

assert.match(selector, /replay-coordination-materialization-owner-contract/);
assert.match(selector, /chart-history-fast-path-unchanged/);
assert.match(selector, /target-history-request-sizing-unchanged/);
assert.match(selector, /replay-source-1m-driven/);

const selected = selectReplayCoordinationMaterializationTransitionSlice({
  fastPathRemeasurement: { status: 'materialization-ready' },
});
assert.equal(selected.status, 'selected');
assert.equal(selected.selectedSlice, 'replay-coordination-materialization-owner-contract');
assert.equal(selected.acceptanceGates.includes('chart-viewport-runtime-owns-viewport-intent'), true);
assert.equal(selected.acceptanceGates.includes('bar-data-runtime-owns-source-and-target-bars'), true);

console.log('v6 replay coordination materialization transition boundary step328 static smoke passed');
