import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_BOUNDARY_BROWSER_ASSERTION_STEP320.md', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_BOUNDARY_BROWSER_ASSERTION_STEP320\.md/);
assert.match(todo, /Latest completed target-TF apply-lag boundary step: Step 320/);
assert.match(todo, /### Step 321 - High-Timeframe Target-History Apply-Lag Measurement Boundary Correction/);

assert.match(doc, /target-history-apply-start/);
assert.match(doc, /viewport-projected/);
assert.match(doc, /chart-data-applied/);
assert.match(doc, /left-extension-loaded/);
assert.match(doc, /diagnostics-readout-visible/);
assert.match(doc, /measurement-boundary/);
assert.match(doc, /target-history-apply-lag-measurement-boundary-correction/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(browserSmoke, /applyChartDataRecord/);
assert.match(browserSmoke, /applyViewportProjection/);
assert.match(browserSmoke, /LEFT_EXTENSION_LOADED/);
assert.match(browserSmoke, /diagnostics-readout-visible/);
assert.match(browserSmoke, /left-extension-listener/);
assert.doesNotMatch(browserSmoke, /applyLagMs\s*<\s*\d+/);
assert.match(browserSmoke, /target-history-apply-start/);

console.log('v6 high timeframe target history apply lag boundary browser closeout step320 static smoke passed');
