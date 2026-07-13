import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338.md', 'utf8');
const selector = await readFile('v6/tests/governance/helpers/replay/target-timeframe-materialization-next-slice-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-timeframe-materialization-next-slice-boundary-step338-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338\.md/);
assert.match(todo, /### Step 338 - Target-Timeframe Materialization Next Slice Reselection/);
assert.match(todo, /Selected `target-history-pack-replay-coordination-member` as the next bounded\s+slice/);
assert.match(handoff, /Step 338 selected\s+`target-history-pack-replay-coordination-member`/);
assert.match(handoff, /Step 338 selects target-history pack replay coordination member\s+integration as the next bounded slice/);

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
