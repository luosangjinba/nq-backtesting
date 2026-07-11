import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_TRIGGER_COORDINATION_ATTRIBUTION_STEP324.md', 'utf8');
const helper = await readFile('v6/src/chart-history/high-timeframe-target-history-trigger-coordination-attribution.js', 'utf8');
const smoke = await readFile('v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_TRIGGER_COORDINATION_ATTRIBUTION_STEP324\.md/);
assert.match(todo, /Latest completed target-TF trigger coordination attribution step: Step 324/);
assert.match(todo, /### Step 325 - High-Timeframe Target-History Leftward Request Scheduling Plan/);

assert.match(doc, /leftward-request-scheduling-attribution-needed/);
assert.match(doc, /chart-history\.leftward-history-input-bridge/);
assert.match(doc, /target-history-leftward-request-scheduling-plan/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(helper, /attributeHighTimeframeTargetHistoryTriggerCoordinationLatency/);
assert.match(helper, /postApplyTargetFetchStartP95Ms/);
assert.match(helper, /target-history-leftward-request-scheduling-plan/);
assert.match(helper, /runtime\.display-timeframe/);
assert.match(helper, /runtime\.leftward-history-extension/);

assert.match(smoke, /leftward-request-scheduling-attribution-needed/);
assert.match(smoke, /display-apply-coordination-attribution-needed/);
assert.match(smoke, /target-history-runtime-attribution-needed/);

assert.match(browserSmoke, /display-timeframe-applied-event/);
assert.match(browserSmoke, /target-fetch-started/);
assert.match(browserSmoke, /chart-history\.leftward-history-input-bridge/);
assert.match(browserSmoke, /target-history-leftward-request-scheduling-plan/);

console.log('v6 high timeframe target history trigger coordination closeout step324 static smoke passed');
