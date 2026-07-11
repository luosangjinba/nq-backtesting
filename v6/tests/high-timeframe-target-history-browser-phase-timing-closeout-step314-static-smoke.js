import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_TIMING_STEP314.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js', 'utf8');
const probe = await readFile('v6/src/chart-history/high-timeframe-target-history-runtime-optimization-probe.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_TIMING_STEP314\.md/);
assert.match(todo, /Latest completed target-TF phase timing step: Step 314/);
assert.match(todo, /### Step 315 - High-Timeframe Target-History Phase Budget Selection/);

assert.match(doc, /fetchMs/);
assert.match(doc, /chartDataReplacementMs/);
assert.match(doc, /viewportReapplyMs/);
assert.match(doc, /applyLagMs/);
assert.match(doc, /visualLatencyMs/);
assert.match(doc, /wide timing thresholds/);
assert.match(doc, /Step 315/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /createHighTimeframeTargetHistoryRuntimeOptimizationProbe/);
assert.match(browserSmoke, /expectedTargetFetchTf: '8h'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1D'/);
assert.match(browserSmoke, /expectedTargetFetchTf: '1W'/);
assert.match(browserSmoke, /fetchMs/);
assert.match(browserSmoke, /chartDataReplacementMs/);
assert.match(browserSmoke, /viewportReapplyMs/);
assert.match(browserSmoke, /maxVisualLatencyMs: 10000/);
assert.match(browserSmoke, /target-history-runtime-optimization-not-needed/);

assert.match(probe, /chartDataReplacementMs/);
assert.match(probe, /viewportReapplyMs/);
assert.match(probe, /browser-visible-apply-lag/);

console.log('v6 high timeframe target history browser phase timing closeout step314 static smoke passed');
