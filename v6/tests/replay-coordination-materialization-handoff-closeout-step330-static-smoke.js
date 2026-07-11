import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_HANDOFF_SELECTION_STEP330.md', 'utf8');
const selector = await readFile('v6/src/replay/replay-coordination-materialization-handoff-slice-selection.js', 'utf8');
const smoke = await readFile('v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js', 'utf8');

assert.match(index, /V6_REPLAY_COORDINATION_MATERIALIZATION_HANDOFF_SELECTION_STEP330\.md/);
assert.match(todo, /Latest completed replay coordination materialization handoff selection step:\s+Step 330/);
assert.match(todo, /### Step 331 - Replay Coordination Materialization Pure Handoff Plan/);
assert.match(handoff, /Latest completed step: Step 330 - Replay Coordination Materialization Runtime/);
assert.match(handoff, /start with Step 331/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /replay-coordination-materialization-pure-handoff-plan/);
assert.match(doc, /source `1m` replay cursor remains the authority/);
assert.match(doc, /the selection step must not add runtime wiring/);
assert.match(doc, /Step 331 should define/);

assert.match(selector, /selectReplayCoordinationMaterializationHandoffSlice/);
assert.match(selector, /owner-contract-ready-select-pure-handoff-plan-before-runtime-wiring/);
assert.match(selector, /pure-handoff-plan-missing-do-not-start-runtime-wiring/);
assert.match(selector, /target-history-request-sizing-unchanged/);
assert.match(selector, /chart-history-fast-path-unchanged/);

assert.match(smoke, /replay-coordination-materialization-pure-handoff-plan/);
assert.match(smoke, /pure-handoff-plan-missing-do-not-start-runtime-wiring/);
assert.match(boundarySmoke, /handoff slice selector must not expose/);
assert.match(boundarySmoke, /no-runtime-wiring-in-selection-step/);

console.log('v6 replay coordination materialization handoff closeout step330 static smoke passed');
