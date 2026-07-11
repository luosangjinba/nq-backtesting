import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_FAST_PATH_REMEASUREMENT_STEP327.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-fast-path-remeasurement.js', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_FAST_PATH_REMEASUREMENT_STEP327\.md/);
assert.match(todo, /Latest completed target-TF fast path remeasurement step: Step 327/);
assert.match(todo, /### Step 328 - Replay Coordination Materialization Transition Slice Selection/);

assert.match(doc, /materialization-ready/);
assert.match(doc, /target-history-fast-path-responsive/);
assert.match(doc, /replay-coordination-materialization-transition/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /remeasureHighTimeframeTargetHistoryFastPathResponsiveness/);
assert.match(helper, /fast-path-target-history-responsiveness-within-budget/);
assert.match(helper, /target-history-fast-path-residual-latency-attribution/);

assert.match(browserSmoke, /remeasureHighTimeframeTargetHistoryFastPathResponsiveness/);
assert.match(browserSmoke, /materialization-ready/);
assert.match(browserSmoke, /visualLatencyP95Ms/);
assert.match(browserSmoke, /targetFetches\.length, 1/);

console.log('v6 high timeframe target history fast path remeasurement closeout step327 static smoke passed');
