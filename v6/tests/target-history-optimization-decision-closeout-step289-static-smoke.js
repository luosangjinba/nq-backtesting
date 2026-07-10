import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_OPTIMIZATION_DECISION_STEP289.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-optimization-decision.js', 'utf8');

assert.match(todo, /Step 289 - Target-History Optimization Decision/);
assert.match(todo, /Step 290 - Target-History Diagnostics Readout/);
assert.match(todo, /small chart-history diagnostics readout/);
assert.match(index, /V6_TARGET_HISTORY_OPTIMIZATION_DECISION_STEP289\.md/);

assert.match(doc, /add-diagnostic-readout/);
assert.match(doc, /tune-activation-policy/);
assert.match(doc, /harden-fallback/);
assert.match(doc, /target-history is faster than source-window fallback/);
assert.match(doc, /Step 290 should add a small/);

assert.match(helper, /decideTargetHistoryOptimization/);
assert.match(helper, /fallbackRateLimit/);
assert.match(helper, /targetSlowRatio/);

console.log('v6 target history optimization decision closeout step289 static smoke passed');
