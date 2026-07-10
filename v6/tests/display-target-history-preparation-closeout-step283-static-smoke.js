import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_PREPARATION_STEP283.md', 'utf8');
const plan = await readFile('v6/src/display-timeframe/display-timeframe-target-history-plan.js', 'utf8');

assert.match(todo, /Step 283 - Display-Timeframe Historical Path Preparation/);
assert.match(todo, /Step 284 - Controlled Display-Timeframe Target-History Opt-In/);
assert.match(todo, /disabled-by-\s+default display\/history target-bars planning boundary/);
assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_PREPARATION_STEP283\.md/);

assert.match(doc, /defaults to disabled/);
assert.match(doc, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(doc, /Display-timeframe runtime still projects from preserved source bars/);
assert.match(doc, /Chart-history leftward extension still uses source-bar windows/);
assert.match(doc, /controlled target-history opt-in runtime\s+path/);

assert.match(plan, /shouldUseTargetBarsForDisplayHistory/);
assert.match(plan, /planDisplayTargetHistoryWindow/);
assert.match(plan, /enabled = false/);

console.log('v6 display target history preparation closeout step283 static smoke passed');
