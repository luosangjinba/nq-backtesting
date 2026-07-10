import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_CHART_HISTORY_TARGET_LEFTWARD_OPT_IN_STEP285.md', 'utf8');
const runtime = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');

assert.match(todo, /Step 285 - Chart-History Target-Timeframe Leftward Opt-In/);
assert.match(todo, /Step 286 - High-Timeframe Target-History Activation Policy/);
assert.match(todo, /default\s+leftward history remains source-window projection/);
assert.match(index, /V6_CHART_HISTORY_TARGET_LEFTWARD_OPT_IN_STEP285\.md/);

assert.match(doc, /CHART_HISTORY_COMMANDS\.REQUEST_LEFT_EXTENSION/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Default chart-history leftward extension does not load target bars/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(runtime, /targetHistory/);
assert.match(runtime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(runtime, /preserveSource: true/);
assert.doesNotMatch(runtime, /fetchV4TargetBars|v4-target-bars-adapter|fetch\(|XMLHttpRequest/);

console.log('v6 leftward history target closeout step285 static smoke passed');
