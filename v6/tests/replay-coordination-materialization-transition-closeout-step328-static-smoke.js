import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_TRANSITION_SELECTION_STEP328.md', 'utf8');
const selector = await readFile('v6/tests/governance/helpers/replay/replay-coordination-materialization-transition-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js', 'utf8');

assert.match(index, /V6_REPLAY_COORDINATION_MATERIALIZATION_TRANSITION_SELECTION_STEP328\.md/);
assert.match(todo, /Latest completed replay coordination materialization transition selection\s+step: Step 328/);
assert.match(todo, /### Step 328 - Replay Coordination Materialization Transition Slice Selection/);
assert.match(handoff, /Step 328 selected/);
assert.match(handoff, /replay-coordination-materialization-owner-contract/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /replay-coordination-materialization-owner-contract/);
assert.match(doc, /replay-source-1m-driven/);
assert.match(doc, /chart-history-fast-path-unchanged/);
assert.match(doc, /target-history-request-sizing-unchanged/);
assert.match(doc, /It did not change replay cursor movement/);

assert.match(selector, /selectReplayCoordinationMaterializationTransitionSlice/);
assert.match(selector, /auditReplayCoordinationMaterializationOwnership/);
assert.match(selector, /materialization-ready-select-owner-contract-before-runtime-change/);
assert.match(selector, /replay-coordination-materialization-ownership-incomplete/);

assert.match(selectionSmoke, /target-history-fast-path-remeasurement-not-ready/);
assert.match(selectionSmoke, /no-replay-coordination-materialization-candidate/);
assert.match(boundarySmoke, /Manual Next and auto-play continue advancing on source `1m` availability/);
assert.match(boundarySmoke, /target-TF history loading does not move replay cursor or viewport intent/);

console.log('v6 replay coordination materialization transition closeout step328 static smoke passed');
