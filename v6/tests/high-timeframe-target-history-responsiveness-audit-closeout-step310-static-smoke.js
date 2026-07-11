import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_AUDIT_STEP310.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-responsiveness-audit.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_AUDIT_STEP310\.md/);
assert.match(todo, /Latest completed target-TF responsiveness audit step: Step 310/);
assert.match(todo, /### Step 311 - High-Timeframe Target-History Responsiveness Browser Harness/);

assert.match(doc, /responsiveness-harness/);
assert.match(doc, /bounded-runtime-optimization/);
assert.match(doc, /replay-coordination-materialization-transition/);
assert.match(doc, /minimum browser samples: `3`/);
assert.match(doc, /fallback-rate limit: `0\.2`/);
assert.match(doc, /p95 browser-visible latency: `350ms`/);
assert.match(doc, /Step 311/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /DEFAULT_THRESHOLDS/);
assert.match(helper, /minBrowserSamples: 3/);
assert.match(helper, /maxVisualLatencyMs: 350/);
assert.match(helper, /maxApplyLagMs: 80/);
assert.match(helper, /auditHighTimeframeTargetHistoryResponsiveness/);
assert.match(helper, /high-timeframe-responsiveness-browser-measurement-missing/);
assert.match(helper, /high-timeframe-target-history-responsive-budget-exceeded/);
assert.match(helper, /high-timeframe-target-history-responsive-materialization-ready/);

assert.match(smoke, /target-history-prerequisites-incomplete/);
assert.match(smoke, /responsiveness-harness/);
assert.match(smoke, /bounded-runtime-optimization/);
assert.match(smoke, /replay-coordination-materialization-transition/);

console.log('v6 high timeframe target history responsiveness audit closeout step310 static smoke passed');
