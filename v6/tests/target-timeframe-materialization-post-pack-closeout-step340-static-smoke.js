import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_POST_PACK_SELECTION_STEP340.md', 'utf8');
const selector = await readFile('v6/src/replay/target-timeframe-materialization-post-pack-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/target-timeframe-materialization-post-pack-selection-step340-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-timeframe-materialization-post-pack-boundary-step340-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_TIMEFRAME_MATERIALIZATION_POST_PACK_SELECTION_STEP340\.md/);
assert.match(todo, /Latest completed target-timeframe materialization post-pack selection step:\s+Step 340/);
assert.match(todo, /### Step 341 - Target Materialization Replay Coordination Diagnostics Readout Owner Contract/);
assert.match(handoff, /Latest completed step: Step 340 - Target-Timeframe Materialization Post-Pack\s+Reselection/);
assert.match(handoff, /start with Step 341/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /target-materialization-replay-coordination-diagnostics-readout/);
assert.match(doc, /narrow runtime handoff remains deferred/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 341 should define/);

assert.match(selector, /selectTargetTimeframeMaterializationPostPackSlice/);
assert.match(selector, /target-materialization-replay-coordination-diagnostics-readout/);
assert.match(selector, /runtime-handoff-deferred-until-diagnostics-readout-selection/);
assert.match(selectionSmoke, /fullEightMemberPackPreserved: true/);
assert.match(boundarySmoke, /Step340 selector must stay pure/);

console.log('v6 target timeframe materialization post-pack closeout step340 static smoke passed');
