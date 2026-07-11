import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_REAL_BUDGET_BROWSER_PHASE_REPORT_STEP317.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js', 'utf8');
const selector = await readFile('v6/src/chart-history/high-timeframe-target-history-phase-budget-selection.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_REAL_BUDGET_BROWSER_PHASE_REPORT_STEP317\.md/);
assert.match(todo, /Latest completed target-TF real-budget browser report step: Step 317/);
assert.match(todo, /### Step 318 - High-Timeframe Target-History Selected Path Slice Selection/);

assert.match(doc, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(doc, /selector defaults/);
assert.match(doc, /real-budget/);
assert.match(doc, /`8h`/);
assert.match(doc, /`1D`/);
assert.match(doc, /`1W`/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 318/);

assert.match(browserSmoke, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(browserSmoke, /records: value\.records/);
assert.doesNotMatch(browserSmoke, /phaseBudgets:\s*\{/);
assert.match(browserSmoke, /allowedStatuses/);
assert.match(browserSmoke, /allowedSlices/);
assert.match(browserSmoke, /target-history-fetch-optimization/);
assert.match(browserSmoke, /target-history-chart-data-replacement-optimization/);
assert.match(browserSmoke, /target-history-viewport-reapply-optimization/);
assert.match(browserSmoke, /target-history-browser-visible-apply-lag-optimization/);
assert.match(browserSmoke, /replay-coordination-materialization-transition/);
assert.match(browserSmoke, /high-timeframe-target-history-responsiveness-harness/);
assert.match(browserSmoke, /durationP95Ms/);
assert.match(browserSmoke, /visualLatencyP95Ms/);
assert.match(browserSmoke, /applyLagP95Ms/);
assert.match(browserSmoke, /fetch/);
assert.match(browserSmoke, /chart-data-replacement/);
assert.match(browserSmoke, /viewport-reapply/);
assert.match(browserSmoke, /browser-visible-apply-lag/);

assert.match(selector, /DEFAULT_PHASE_BUDGETS/);
assert.match(selector, /fetch: 120/);
assert.match(selector, /'chart-data-replacement': 120/);
assert.match(selector, /'viewport-reapply': 80/);
assert.match(selector, /'browser-visible-apply-lag': 80/);

console.log('v6 high timeframe target history real budget browser phase report closeout step317 static smoke passed');
