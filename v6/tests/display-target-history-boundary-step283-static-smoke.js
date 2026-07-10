import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const plan = await readFile('v6/src/display-timeframe/display-timeframe-target-history-plan.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const leftwardRuntime = await readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8');
const targetAdapter = await readFile('v6/src/bar-data/v4-target-bars-adapter.js', 'utf8');
const barRuntime = await readFile('v6/src/bar-data/bar-data-runtime.js', 'utf8');
const displayRuntimeSmoke = await readFile('v6/tests/display-timeframe-runtime-smoke.js', 'utf8');

assert.match(plan, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(plan, /target-history-opt-in/);
assert.match(plan, /target-history-disabled/);
assert.match(plan, /enabled = false/);

assert.doesNotMatch(displayRuntime, /fetchV4TargetBars/);
assert.doesNotMatch(displayRuntime, /v4-target-bars-adapter/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /targetHistory = \{\}/);
assert.match(displayRuntime, /GET_SOURCE_BARS/);
assert.match(displayRuntime, /preserveSource: true/);

assert.doesNotMatch(leftwardRuntime, /fetchV4TargetBars/);
assert.doesNotMatch(leftwardRuntime, /v4-target-bars-adapter/);
assert.match(leftwardRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(leftwardRuntime, /targetHistory/);
assert.match(leftwardRuntime, /LOAD_WINDOW/);

assert.match(targetAdapter, /\/v4\/target_bars/);
assert.match(barRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntimeSmoke, /displayTimeframe: 1/);
assert.match(displayRuntimeSmoke, /sourceBarCount, 6/);

console.log('v6 display target history boundary step283 static smoke passed');
