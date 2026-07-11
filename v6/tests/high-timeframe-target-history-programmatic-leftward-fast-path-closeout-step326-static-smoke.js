import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_PROGRAMMATIC_LEFTWARD_FAST_PATH_STEP326.md', 'utf8');
const resolver = await readFile('v6/src/chart-history/leftward-history-request-schedule.js', 'utf8');
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const bridgeSmoke = await readFile('v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js', 'utf8');
const browserSmoke = await readFile('v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_PROGRAMMATIC_LEFTWARD_FAST_PATH_STEP326\.md/);
assert.match(todo, /Latest completed target-TF programmatic leftward fast path step: Step 326/);
assert.match(todo, /### Step 327 - High-Timeframe Target-History Fast Path Responsiveness Re-measurement/);

assert.match(doc, /programmatic leftward request fast path/);
assert.match(doc, /Native visible-range input still schedules/);
assert.match(doc, /Replay remains source\s+`1m` driven/);

assert.match(resolver, /resolveLeftwardHistoryRequestSchedule/);
assert.match(resolver, /runtime-display-timeframe-applied/);
assert.match(resolver, /programmatic-target-history-fast-path/);

assert.match(bridge, /programmaticFastArmedPaneIds/);
assert.match(bridge, /programmaticFastInFlightPaneIds/);
assert.match(bridge, /runtime-display-timeframe-applied/);

assert.match(bridgeSmoke, /CHART_HISTORY_EVENTS\.LEFT_EXTENSION_LOADED/);
assert.match(bridgeSmoke, /target-history-high-timeframe-policy/);
assert.match(browserSmoke, /assert\.notEqual\(attribution\.status, 'leftward-request-scheduling-attribution-needed'\)/);

console.log('v6 high timeframe target history programmatic leftward fast path closeout step326 static smoke passed');
