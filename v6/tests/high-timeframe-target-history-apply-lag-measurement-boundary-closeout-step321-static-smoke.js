import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_MEASUREMENT_BOUNDARY_CORRECTION_STEP321.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-browser-step321-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_MEASUREMENT_BOUNDARY_CORRECTION_STEP321\.md/);
assert.match(todo, /Latest completed target-TF apply-lag measurement step: Step 321/);
assert.match(todo, /### Step 322 - High-Timeframe Target-History Visual-Latency Phase Attribution Stabilization/);

assert.match(doc, /diagnostics-readout-visible\.time - left-extension-loaded\.time/);
assert.match(doc, /applyLagP95Ms` is below the default `80ms` budget/);
assert.match(doc, /target-history-browser-visible-apply-lag-optimization/);
assert.match(doc, /visualLatencyP95Ms/);
assert.match(doc, /chart-data-replacement/);
assert.match(doc, /viewport-reapply/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /measurementBoundary: 'event-driven-readout-milestones'/);
assert.match(browserSmoke, /readoutObservation, 'left-extension-listener'/);
assert.match(browserSmoke, /diagnostics-readout-visible/);
assert.match(browserSmoke, /left-extension-loaded/);
assert.match(browserSmoke, /applyLagMs: Math\.max\(0, readoutVisibleAt - leftExtensionLoadedAt\)/);
assert.match(browserSmoke, /selectHighTimeframeTargetHistoryPhaseBudget/);
assert.match(browserSmoke, /target-history-browser-visible-apply-lag-optimization/);
assert.match(browserSmoke, /target-history-chart-data-replacement-optimization/);
assert.match(browserSmoke, /target-history-viewport-reapply-optimization/);
assert.match(browserSmoke, /visualLatencyP95Ms > selection\.probe\.budgetReport\.thresholds\.maxVisualLatencyMs/);

console.log('v6 high timeframe target history apply lag measurement boundary closeout step321 static smoke passed');
