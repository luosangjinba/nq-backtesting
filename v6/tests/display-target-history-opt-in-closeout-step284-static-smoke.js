import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_OPT_IN_STEP284.md', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');

assert.match(todo, /Step 284 - Controlled Display-Timeframe Target-History Opt-In/);
assert.match(todo, /Step 285 - Chart-History Target-Timeframe Leftward Opt-In/);
assert.match(todo, /default TF\s+switching remains source projection/);
assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_OPT_IN_STEP284\.md/);

assert.match(doc, /targetHistory\.enabled/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Default display-timeframe switching does not load target bars/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(displayRuntime, /targetHistory = \{\}/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /preserveSource: true/);
assert.doesNotMatch(displayRuntime, /fetchV4TargetBars|v4-target-bars-adapter|fetch\(|XMLHttpRequest/);

console.log('v6 display target history opt-in closeout step284 static smoke passed');
