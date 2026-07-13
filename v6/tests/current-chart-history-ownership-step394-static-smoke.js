import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [runtime, orchestrator, inputBridge, displayRuntime] = await Promise.all([
  readFile('v6/src/chart-history/leftward-history-extension-runtime.js', 'utf8'),
  readFile('v6/src/chart-history/leftward-history-data-orchestrator.js', 'utf8'),
  readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8'),
  readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8'),
]);

assert.match(runtime, /leftward-history-data-orchestrator\.js/);
assert.match(orchestrator, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(orchestrator, /CHART_DATA_PROJECTION_COMMANDS\.PROJECT/);
assert.doesNotMatch(runtime + orchestrator + displayRuntime, /fetchV4TargetBars|v4-target-bars-adapter/);
assert.doesNotMatch(inputBridge, /fetchV4TargetBars|LOAD_TARGET_WINDOW|CHART_DATA_COMMANDS/);
assert.match(inputBridge, /subscribeVisibleRangeChange/);

console.log('v6 current chart history ownership step394 static smoke passed');
