import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_VISUAL_LATENCY_PHASE_ATTRIBUTION_STABILIZATION_STEP322.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-visual-latency-attribution.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-visual-latency-attribution-step322-smoke.js', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_VISUAL_LATENCY_PHASE_ATTRIBUTION_STABILIZATION_STEP322\.md/);
assert.match(todo, /Latest completed target-TF visual-latency attribution step: Step 322/);
assert.match(todo, /### Step 323 - High-Timeframe Target-History Browser Rendering Visibility Attribution/);

assert.match(doc, /visual-latency-attribution-needed/);
assert.match(doc, /browser-rendering-or-measurement-boundary/);
assert.match(doc, /target-history-browser-rendering-visibility-attribution/);
assert.match(doc, /sub-frame noise/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution/);
assert.match(helper, /DEFAULT_SUBFRAME_NOISE_MS = 16/);
assert.match(helper, /visual-latency-exceeds-budget-with-only-subframe-runtime-phase-costs/);
assert.match(helper, /target-history-browser-rendering-visibility-attribution/);

assert.match(smoke, /visual-latency-attribution-needed/);
assert.match(smoke, /target-history-browser-rendering-visibility-attribution/);
assert.match(smoke, /runtime-phase-stable/);

assert.match(browserSmoke, /stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution/);
assert.match(browserSmoke, /browser-rendering-or-measurement-boundary/);
assert.match(browserSmoke, /target-history-browser-rendering-visibility-attribution/);
assert.match(browserSmoke, /measurementBoundary: 'event-driven-readout-milestones'/);

console.log('v6 high timeframe target history visual latency attribution closeout step322 static smoke passed');
