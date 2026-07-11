import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BROWSER_HARNESS_STEP311.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-responsiveness-browser-step311-smoke.js', 'utf8');
const audit = await readFile('v6/src/chart-history/high-timeframe-target-history-responsiveness-audit.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BROWSER_HARNESS_STEP311\.md/);
assert.match(todo, /Latest completed target-TF responsiveness harness step: Step 311/);
assert.match(todo, /### Step 312 - High-Timeframe Target-History Responsiveness Budget Decision/);

assert.match(doc, /8h/);
assert.match(doc, /1D/);
assert.match(doc, /1W/);
assert.match(doc, /visual latency/);
assert.match(doc, /apply lag/);
assert.match(doc, /target\/source request counts/);
assert.match(doc, /wide timing thresholds/);
assert.match(doc, /Step 312/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /openV6Page/);
assert.match(browserSmoke, /auditHighTimeframeTargetHistoryResponsiveness/);
assert.match(browserSmoke, /browserVisible/);
assert.match(browserSmoke, /visualLatencyMs/);
assert.match(browserSmoke, /applyLagMs/);
assert.match(browserSmoke, /targetFetches/);
assert.match(browserSmoke, /expectedTargetFetchTf: '8h'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1D'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1W'/);
assert.match(browserSmoke, /maxVisualLatencyMs: 10000/);
assert.match(browserSmoke, /replay-coordination-materialization-transition/);

assert.match(audit, /maxVisualLatencyMs: 350/);
assert.match(audit, /maxApplyLagMs: 80/);
assert.match(audit, /minBrowserSamples: 3/);

console.log('v6 high timeframe target history responsiveness browser closeout step311 static smoke passed');
