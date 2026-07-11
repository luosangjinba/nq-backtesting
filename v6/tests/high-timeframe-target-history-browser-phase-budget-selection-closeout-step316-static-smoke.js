import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_BUDGET_SELECTION_STEP316.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js', 'utf8');
const selector = await readFile('v6/src/chart-history/high-timeframe-target-history-phase-budget-selection.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_BUDGET_SELECTION_STEP316\.md/);
assert.match(todo, /Latest completed target-TF browser phase budget step: Step 316/);
assert.match(todo, /### Step 317 - High-Timeframe Target-History Real-Budget Browser Phase Report/);

assert.match(doc, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(doc, /wide phase and responsiveness budgets/);
assert.match(doc, /real-budget browser report/);
assert.match(doc, /fetchMs/);
assert.match(doc, /chartDataReplacementMs/);
assert.match(doc, /viewportReapplyMs/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(browserSmoke, /expectedTargetFetchTf: '8h'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1D'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1W'/);
assert.match(browserSmoke, /fetch: 10000/);
assert.match(browserSmoke, /chart-data-replacement': 10000/);
assert.match(browserSmoke, /viewport-reapply': 10000/);
assert.match(browserSmoke, /browser-visible-apply-lag': 10000/);
assert.match(browserSmoke, /materialization-ready/);
assert.match(browserSmoke, /replay-coordination-materialization-transition/);

assert.match(selector, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(selector, /DEFAULT_PHASE_BUDGETS/);

console.log('v6 high timeframe target history browser phase budget selection closeout step316 static smoke passed');
