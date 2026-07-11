import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_PHASE_BUDGET_SELECTION_STEP315.md', 'utf8');
const selector = await readFile('v6/src/chart-history/high-timeframe-target-history-phase-budget-selection.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_PHASE_BUDGET_SELECTION_STEP315\.md/);
assert.match(todo, /Latest completed target-TF phase budget step: Step 315/);
assert.match(todo, /### Step 316 - High-Timeframe Target-History Browser Phase Budget Selection/);

assert.match(doc, /target-history-fetch-optimization/);
assert.match(doc, /target-history-chart-data-replacement-optimization/);
assert.match(doc, /target-history-viewport-reapply-optimization/);
assert.match(doc, /target-history-browser-visible-apply-lag-optimization/);
assert.match(doc, /replay-coordination-materialization-transition/);
assert.match(doc, /high-timeframe-target-history-responsiveness-harness/);
assert.match(doc, /Default phase budgets/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(selector, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(selector, /createHighTimeframeTargetHistoryRuntimeOptimizationProbe/);
assert.match(selector, /DEFAULT_PHASE_BUDGETS/);
assert.match(selector, /phaseFindings/);
assert.match(selector, /selectedPhase/);
assert.match(selector, /selectedSlice/);
assert.match(selector, /materialization-ready/);
assert.match(selector, /optimize-phase/);

assert.match(smoke, /target-history-fetch-optimization/);
assert.match(smoke, /target-history-chart-data-replacement-optimization/);
assert.match(smoke, /target-history-viewport-reapply-optimization/);
assert.match(smoke, /target-history-browser-visible-apply-lag-optimization/);
assert.match(smoke, /replay-coordination-materialization-transition/);
assert.match(smoke, /high-timeframe-target-history-responsiveness-harness/);

console.log('v6 high timeframe target history phase budget selection closeout step315 static smoke passed');
