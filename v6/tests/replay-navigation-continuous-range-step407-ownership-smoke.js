import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const coordinator = await readFile('v6/src/replay-navigation/replay-navigation-runtime.js', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_NAVIGATION_CONTINUOUS_RANGE_STEP407.md', 'utf8');
const alignmentDoc = await readFile('v6/docs/V6_FIXED_TIMEFRAME_BUCKET_ALIGNMENT_STEP408.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const materializer = await readFile('v6/src/replay/replay-cursor-pane-materializer.js', 'utf8');

assert.match(coordinator, /fromCursorTime: replayState\.cursorTime/);
assert.match(materializer, /createRangeWindowPayloads/);
assert.match(materializer, /direction: 'forward'/);
assert.match(materializer, /range \? cloneBars\(projectionRecord\.bars\)/);
assert.match(materializer, /CHART_DATA_COMMANDS\.APPEND_BARS/);
assert.doesNotMatch(materializer, /CHART_VIEWPORT_COMMANDS/);
assert.doesNotMatch(materializer, /lightweight-charts/);
assert.match(doc, /Status: continuous-range correction completed/);
assert.match(doc, /fixed-timeframe alignment defect corrected by Step 408/);
assert.match(doc, /human visual recheck/);
assert.match(alignmentDoc, /target-timeframe-domain/);
assert.match(alignmentDoc, /Step 407\/408 remains open/);
assert.match(index, /V6_REPLAY_NAVIGATION_CONTINUOUS_RANGE_STEP407/);

console.log('V6 replay navigation continuous range Step 407 ownership smoke passed.');
