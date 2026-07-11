import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_OWNER_CONTRACT_STEP329.md', 'utf8');
const contract = await readFile('v6/src/replay/replay-coordination-materialization-owner-contract.js', 'utf8');
const contractSmoke = await readFile('v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js', 'utf8');

assert.match(index, /V6_REPLAY_COORDINATION_MATERIALIZATION_OWNER_CONTRACT_STEP329\.md/);
assert.match(todo, /Latest completed replay coordination materialization owner contract step:\s+Step 329/);
assert.match(todo, /### Step 329 - Replay Coordination Materialization Owner Contract/);
assert.match(handoff, /Step 329 defined the replay coordination materialization owner contract/);
assert.match(handoff, /source-cursor target-bar no-future\s+reveal policy/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /replay-coordination-materialization-contract/);
assert.match(doc, /source `1m` replay state as the cursor authority/);
assert.match(doc, /source cursor is inside the target bucket/);
assert.match(doc, /none of these states may move the replay cursor or viewport intent/);
assert.match(doc, /Step 330 should select the first bounded runtime handoff slice/);

assert.match(contract, /createReplayCoordinationMaterializationOwnerContract/);
assert.match(contract, /resolveReplayCoordinationTargetBarRevealState/);
assert.match(contract, /source-1m-replay-cursor-authority/);
assert.match(contract, /target-bars-display-materialization-input-only/);
assert.match(contract, /chart-history-request-coordination-only/);

assert.match(contractSmoke, /source-cursor-inside-target-bucket/);
assert.match(contractSmoke, /target-bar-complete-before-or-at-source-cursor/);
assert.match(boundarySmoke, /No-future filtering uses replay cursor against the target bar's bucket/);
assert.match(boundarySmoke, /materialization owner contract must not expose/);

console.log('v6 replay coordination materialization owner contract closeout step329 static smoke passed');
