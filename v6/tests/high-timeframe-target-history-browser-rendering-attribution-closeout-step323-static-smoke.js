import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_RENDERING_VISIBILITY_ATTRIBUTION_STEP323.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-browser-rendering-attribution.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_RENDERING_VISIBILITY_ATTRIBUTION_STEP323\.md/);
assert.match(todo, /Latest completed target-TF browser-rendering attribution step: Step 323/);
assert.match(todo, /### Step 324 - High-Timeframe Target-History Trigger Coordination Latency Attribution/);

assert.match(doc, /trigger-coordination-latency-attribution/);
assert.match(doc, /preLeftExtensionP95Ms/);
assert.match(doc, /postLeftExtensionReadoutP95Ms/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /attributeHighTimeframeTargetHistoryBrowserRenderingVisibility/);
assert.match(helper, /postLeftExtensionReadoutP95Ms/);
assert.match(helper, /target-history-trigger-coordination-latency-attribution/);
assert.match(helper, /target-history-browser-rendering-paint-visibility-plan/);

assert.match(smoke, /trigger-coordination-attribution-needed/);
assert.match(smoke, /browser-rendering-visibility-attribution-needed/);
assert.match(smoke, /materialization-ready/);

assert.match(browserSmoke, /requestAnimationFrame/);
assert.match(browserSmoke, /first-animation-frame-after-readout/);
assert.match(browserSmoke, /second-animation-frame-after-readout/);
assert.match(browserSmoke, /target-history-trigger-coordination-latency-attribution/);

console.log('v6 high timeframe target history browser rendering attribution closeout step323 static smoke passed');
