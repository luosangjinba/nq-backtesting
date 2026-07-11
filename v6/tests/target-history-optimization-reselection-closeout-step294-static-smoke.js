import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_HISTORY_OPTIMIZATION_RESELECTION_STEP294.md', 'utf8');
const helper = await readFile('v6/src/chart-history/target-history-optimization-decision.js', 'utf8');
const packDoc = await readFile('v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_REGRESSION_PACK_STEP293.md', 'utf8');

assert.match(todo, /Step 294 - Target-History Optimization Re-selection/);
assert.match(todo, /Step 295 - Target-History Request Sizing/);
assert.match(index, /V6_TARGET_HISTORY_OPTIMIZATION_RESELECTION_STEP294\.md/);

assert.match(doc, /target-history request sizing/);
assert.match(doc, /tune-target-request-sizing/);
assert.match(doc, /harden-fallback/);
assert.match(doc, /tune-activation-policy/);
assert.match(doc, /Step 295 should audit/);

assert.match(helper, /reselectTargetHistoryOptimization/);
assert.match(helper, /completedSet\.has\('add-diagnostic-readout'\)/);
assert.match(helper, /target-history-readout-complete-next-size-requests/);

assert.match(packDoc, /target-history-diagnostics-readout-regression-pack-step293-smoke\.js/);

console.log('v6 target history optimization reselection closeout step294 static smoke passed');
