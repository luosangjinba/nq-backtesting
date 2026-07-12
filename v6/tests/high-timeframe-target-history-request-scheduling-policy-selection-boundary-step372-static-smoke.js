import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selector = await readFile(
  'v6/src/chart-history/high-timeframe-target-history-request-scheduling-policy-selection.js',
  'utf8',
);
const resolver = await readFile('v6/src/chart-history/leftward-history-request-schedule.js', 'utf8');
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const step371Doc = await readFile(
  'v6/docs/V6_HTF_DRAG_TRIGGERED_LOW_OVERHEAD_RUNTIME_MILESTONES_STEP371.md',
  'utf8',
);

assert.match(selector, /chart-history\.leftward-history-input-bridge/);
assert.match(selector, /CURRENT_DELAY_MS = 500/);
assert.match(selector, /SELECTED_HTF_TARGET_HISTORY_DELAY_MS = 100/);
assert.match(selector, /native-target-history-reduced-delay-with-coalescing/);
assert.match(selector, /keep-native-visible-range-delay-500ms/);
assert.match(selector, /native-target-history-zero-delay-fast-path/);
assert.match(selector, /low-timeframe-native-drag-and-wheel-stay-on-requestDelayMs-500/);
assert.match(selector, /target-history-disabled-path-stays-on-requestDelayMs-500/);
assert.match(selector, /shouldRequest-visible-range-validation-remains-before-dispatch/);
assert.match(selector, /sticky-drag-and-wheel-prepend-stability-smokes-must-stay-green/);
assert.match(selector, /programmatic-target-history-fast-path-remains-unchanged/);
assert.match(selector, /runtime-replay-chart-viewport-chart-engine-and-shell-behavior-remain-unchanged/);

assert.match(step371Doc, /inputToTargetFetchStartMs/);
assert.match(step371Doc, /requestDelayMs=500/);
assert.match(step371Doc, /target fetch duration is effectively zero/);
assert.match(step371Doc, /fetch-to-chart-data and left-extension-to-readout are low/);

assert.match(resolver, /PROGRAMMATIC_FAST_PATH_REASONS/);
assert.match(resolver, /reason = 'native-visible-range'/);
assert.match(resolver, /mode: 'delayed'/);
assert.doesNotMatch(resolver, /SELECTED_HTF_TARGET_HISTORY_DELAY_MS|native-target-history-reduced-delay-with-coalescing/);

assert.match(bridge, /requestDelayMs = 500/);
assert.match(bridge, /chartSurface\.subscribeVisibleRangeChange/);
assert.match(bridge, /planLeftwardTargetHistoryActivation/);
assert.doesNotMatch(bridge, /SELECTED_HTF_TARGET_HISTORY_DELAY_MS|native-target-history-reduced-delay-with-coalescing/);

assert.doesNotMatch(selector, /dispatchCommand|subscribeEvent|setTimeoutFn|clearTimeoutFn|registerCommand|registerRuntime|UPDATE_SNAPSHOT/);

console.log('v6 high timeframe target history request scheduling policy selection boundary step372 static smoke passed');
