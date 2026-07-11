import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BUDGET_DECISION_STEP312.md', 'utf8');
const decision = await readFile('v6/src/chart-history/high-timeframe-target-history-responsiveness-budget-decision.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BUDGET_DECISION_STEP312\.md/);
assert.match(todo, /Latest completed target-TF responsiveness budget step: Step 312/);
assert.match(todo, /### Step 313 - High-Timeframe Target-History Bounded Runtime Optimization Probe/);

assert.match(doc, /bounded-runtime-optimization/);
assert.match(doc, /replay-coordination-materialization-transition/);
assert.match(doc, /responsiveness-harness/);
assert.match(doc, /budgetFindings/);
assert.match(doc, /p95 browser-visible latency/);
assert.match(doc, /p95 apply lag/);
assert.match(doc, /The next implementation slice is `bounded-runtime-optimization`/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(decision, /auditHighTimeframeTargetHistoryResponsiveness/);
assert.match(decision, /createHighTimeframeTargetHistoryResponsivenessBudgetReport/);
assert.match(decision, /budgetFindings/);
assert.match(decision, /optimize-before-materialization/);
assert.match(decision, /materialization-transition-ready/);
assert.match(decision, /measurement-incomplete/);
assert.match(decision, /fallbackRate/);
assert.match(decision, /durationP95Ms/);
assert.match(decision, /visualLatencyP95Ms/);
assert.match(decision, /applyLagP95Ms/);

assert.match(smoke, /materialization-transition-ready/);
assert.match(smoke, /optimize-before-materialization/);
assert.match(smoke, /measurement-incomplete/);
assert.match(smoke, /bounded-runtime-optimization/);
assert.match(smoke, /replay-coordination-materialization-transition/);
assert.match(smoke, /responsiveness-harness/);

console.log('v6 high timeframe target history responsiveness budget decision closeout step312 static smoke passed');
