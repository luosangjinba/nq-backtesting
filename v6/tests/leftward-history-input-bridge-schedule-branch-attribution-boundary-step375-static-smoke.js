import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const smoke = await readFile(
  'v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js',
  'utf8',
);

assert.match(bridge, /__v6LeftwardHistoryInputBridgeTrace/);
assert.match(bridge, /phase: 'schedule-resolved'/);
assert.match(bridge, /phase: 'timer-scheduled'/);
assert.match(bridge, /requestedReason: reason/);
assert.match(bridge, /resolvedReason/);
assert.match(bridge, /activationStatus/);
assert.match(bridge, /nativeTargetHistoryDelayMs/);
assert.match(bridge, /targetHistoryEnabled/);
assert.match(bridge, /source: 'leftward-history-input-bridge'/);

assert.match(smoke, /native-target-history-reduced-delay-with-coalescing/);
assert.match(smoke, /runtime-display-timeframe-applied/);
assert.match(smoke, /programmatic-target-history-fast-path/);

assert.doesNotMatch(bridge, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);

console.log('v6 leftward history input bridge schedule branch attribution boundary step375 static smoke passed');
