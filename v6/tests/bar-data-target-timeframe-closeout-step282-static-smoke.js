import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_BAR_DATA_TARGET_TIMEFRAME_SUPPORT_STEP282.md', 'utf8');
const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const runtime = await readFile('v6/src/bar-data/bar-data-runtime.js', 'utf8');

assert.match(todo, /Step 282 - Bar-Data Runtime Target-Timeframe Support/);
assert.match(todo, /Step 283 - Display-Timeframe Historical Path Preparation/);
assert.match(todo, /explicitly plan, load, cache,\s+release, and diagnose target-TF windows/);
assert.match(index, /V6_BAR_DATA_TARGET_TIMEFRAME_SUPPORT_STEP282\.md/);

assert.match(doc, /This is still not the default display-timeframe or leftward-history path/);
assert.match(doc, /PLAN_TARGET_WINDOW/);
assert.match(doc, /LOAD_TARGET_WINDOW/);
assert.match(doc, /GET_TARGET_CACHE_SUMMARY/);
assert.match(doc, /Display-timeframe runtime does not request target bars yet/);
assert.match(doc, /Chart-history leftward extension does not request target bars yet/);

assert.match(contracts, /LOAD_TARGET_WINDOW/);
assert.match(contracts, /TARGET_WINDOW_LOADED/);
assert.match(runtime, /fetchTargetBars = fetchV4TargetBars/);
assert.match(runtime, /createTargetBarWindowCache/);
assert.match(runtime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(runtime, /BAR_DATA_COMMANDS\.LOAD_WINDOW/);

console.log('v6 bar-data target timeframe closeout step282 static smoke passed');
