import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338.md', 'utf8');
const selector = await readFile('v6/src/replay/target-timeframe-materialization-next-slice-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-timeframe-materialization-next-slice-boundary-step338-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338\.md/);
assert.match(todo, /Latest completed target-timeframe materialization selection step: Step 338/);
assert.match(todo, /### Step 339 - Target-History Pack Replay Coordination Member Integration/);
assert.match(handoff, /Latest completed step: Step 338 - Target-Timeframe Materialization Next\s+Slice Reselection/);
assert.match(handoff, /start with Step 339/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /target-history-pack-replay-coordination-member/);
assert.match(doc, /target-history browser regression pack/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 339 should add/);

assert.match(selector, /selectTargetTimeframeMaterializationNextSlice/);
assert.match(selector, /target-history-pack-replay-coordination-member/);
assert.match(selector, /no-runtime-behavior-change-in-selection-step/);
assert.match(selectionSmoke, /target-history-pack-replay-coordination-member/);
assert.match(boundarySmoke, /Step338 selector must stay pure/);

console.log('v6 target timeframe materialization next slice closeout step338 static smoke passed');
