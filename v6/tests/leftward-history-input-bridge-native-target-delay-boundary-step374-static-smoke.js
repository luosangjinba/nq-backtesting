import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const resolver = await readFile('v6/src/chart-history/leftward-history-request-schedule.js', 'utf8');
const step373Doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_VISIBLE_RANGE_REDUCED_DELAY_RESOLVER_STEP373.md',
  'utf8',
);

assert.match(bridge, /DEFAULT_NATIVE_TARGET_HISTORY_DELAY_MS = 100/);
assert.match(bridge, /function nativeTargetHistoryDelayFor/);
assert.match(bridge, /reason !== 'native-visible-range'/);
assert.match(bridge, /activationPayload\?\.targetHistory\?\.enabled/);
assert.match(bridge, /const selectedNativeTargetHistoryDelayMs = nativeTargetHistoryDelayFor/);
assert.match(bridge, /nativeTargetHistoryDelayMs: selectedNativeTargetHistoryDelayMs/);
assert.match(bridge, /targetHistoryActivation\.enabled === false/);
assert.match(bridge, /requestDelayMs = 500/);
assert.match(bridge, /shouldRequest\(visibleRange\)/);
assert.match(bridge, /PROGRAMMATIC_FAST_PATH|programmaticFastArmedPaneIds/);

assert.match(resolver, /nativeTargetHistoryDelayMs = null/);
assert.match(resolver, /native-target-history-reduced-delay-with-coalescing/);
assert.match(step373Doc, /pass `nativeTargetHistoryDelayMs: 100` only for native visible-range requests/);

assert.doesNotMatch(bridge, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);

console.log('v6 leftward history input bridge native target delay boundary step374 static smoke passed');
