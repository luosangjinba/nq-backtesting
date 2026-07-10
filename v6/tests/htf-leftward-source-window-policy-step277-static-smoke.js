import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_HTF_LEFTWARD_SOURCE_WINDOW_POLICY_STEP277.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const policy = await readFile('v6/src/chart-history/leftward-source-window-policy.js', 'utf8');
const app = await readFile('v6/src/app.js', 'utf8');

assert.match(doc, /adaptive source-window policy/);
assert.match(doc, /Chart-history owns deciding how much source data/);
assert.match(doc, /Bar-data owns enforcing request limits/);
assert.match(doc, /roughly 20 display candles/);
assert.match(doc, /roughly 12 display candles/);
assert.match(doc, /global source-window hard limit/);
assert.match(doc, /Lightweight Charts historical prepends replace\s+series data/);

assert.match(todo, /Step 277 - HTF Leftward Source Window Policy/);
assert.match(todo, /Step 278 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Steps 264-277/);
assert.match(index, /V6_HTF_LEFTWARD_SOURCE_WINDOW_POLICY_STEP277\.md/);

assert.match(policy, /LEFTWARD_MAX_SOURCE_BAR_LIMIT = 40000/);
assert.match(policy, /MINUTE_HTF_TARGET_DISPLAY_BARS = 20/);
assert.match(policy, /'1D': 12/);
assert.match(policy, /'1W': 4/);
assert.match(policy, /'1M': 1/);
assert.match(app, /LEFTWARD_MAX_SOURCE_BAR_LIMIT/);
assert.doesNotMatch(app, /maxBarsPerWindow: 2500/);

console.log('v6 HTF leftward source window policy step277 static smoke passed');
