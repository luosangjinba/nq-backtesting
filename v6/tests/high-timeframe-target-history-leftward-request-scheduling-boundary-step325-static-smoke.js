import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const step324Doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_TRIGGER_COORDINATION_ATTRIBUTION_STEP324.md', 'utf8');
const plan = await readFile('v6/src/chart-history/high-timeframe-target-history-leftward-request-scheduling-plan.js', 'utf8');

assert.match(bridge, /requestDelayMs = 500/);
assert.match(bridge, /subscribeEvent\(DISPLAY_TIMEFRAME_EVENTS\.APPLIED, checkPaneAfterRuntimeUpdate\)/);
assert.match(bridge, /subscribeEvent\(CHART_VIEWPORT_EVENTS\.PROJECTED, checkPaneAfterRuntimeUpdate\)/);
assert.match(bridge, /setTimeoutFn\(\(\) => scheduleFromSurface\(paneId\), 0\)/);
assert.match(bridge, /const timer = setTimeoutFn\(\(\) => dispatchPending\(paneId\), delayMs\)/);
assert.match(bridge, /chartSurface\.subscribeVisibleRangeChange/);
assert.match(bridge, /scheduleRequest\(paneId, visibleRange\)/);
assert.match(bridge, /planLeftwardTargetHistoryActivation/);

assert.match(step324Doc, /chart-history\.leftward-history-input-bridge/);
assert.match(step324Doc, /target-history-leftward-request-scheduling-plan/);

assert.match(plan, /keep native visible-range drag\/wheel scheduling on requestDelayMs/);
assert.match(plan, /runtime-event scheduling reason/);
assert.match(plan, /bypass the second requestDelayMs debounce/);
assert.match(plan, /continue requiring shouldRequest visible-range validation before dispatch/);
assert.match(plan, /keep chart-history runtime, chart viewport intent, chart-engine, replay, and shell behavior unchanged/);

console.log('v6 high timeframe target history leftward request scheduling boundary step325 static smoke passed');
