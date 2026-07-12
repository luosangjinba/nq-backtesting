import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const smoke = await readFile(
  'v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');

assert.match(bridge, /shouldPreserveNativeTargetHistoryPending/);
assert.match(bridge, /pending\.schedule\.mode !== 'native-target-history-reduced-delay'/);
assert.match(bridge, /schedule\.mode !== 'delayed'/);
assert.match(bridge, /schedule\.reason === 'runtime-surface-check'/);
assert.match(bridge, /schedule\.reason === 'runtime-left-extension-loaded'/);
assert.match(bridge, /phase: 'schedule-suppressed'/);
assert.match(bridge, /pendingByPaneId\.set\(paneId, \{\s+activationPayload,\s+schedule,/);
assert.match(bridge, /clearPending\(paneId\);\s+const delayMs = schedule\.delayMs/);
assert.doesNotMatch(bridge, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);

assert.match(smoke, /CHART_HISTORY_EVENTS\.LEFT_EXTENSION_LOADED/);
assert.match(smoke, /CHART_VIEWPORT_EVENTS\.PROJECTED/);
assert.match(smoke, /runtime-left-extension-loaded/);
assert.match(smoke, /runtime-surface-check/);
assert.match(smoke, /displayTimeframe: 5/);
assert.match(smoke, /targetHistoryActivation: \{ enabled: false \}/);
assert.match(smoke, /delayMs, 100/);
assert.match(smoke, /delayMs, 500/);

assert.doesNotMatch(app, /leftward-history-input-bridge-runtime-delayed-suppression/);

console.log('v6 leftward history input bridge runtime delayed suppression boundary step376 static smoke passed');
