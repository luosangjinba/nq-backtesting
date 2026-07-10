import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_ACTIVATION_STEP286.md', 'utf8');
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const policy = await readFile('v6/src/chart-history/leftward-target-history-activation.js', 'utf8');

assert.match(todo, /Step 286 - High-Timeframe Target-History Activation Policy/);
assert.match(todo, /Step 287 - Activated Target-History Browser Integration/);
assert.match(todo, /targetHistory\.enabled/);
assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_ACTIVATION_STEP286\.md/);

assert.match(doc, /Fixed target timeframes activate at `1h` and above/);
assert.match(doc, /targetHistoryActivation\.enabled: false/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(bridge, /PANE_COMMANDS\.GET_BY_ID/);
assert.match(bridge, /planLeftwardTargetHistoryActivation/);
assert.match(bridge, /targetHistoryActivation\.enabled === false/);
assert.doesNotMatch(bridge, /fetchV4TargetBars|v4-target-bars-adapter|fetch\(|XMLHttpRequest/);

assert.match(policy, /minFixedMinutes = 60/);
assert.match(policy, /target-history-high-timeframe-policy/);

console.log('v6 leftward target history activation closeout step286 static smoke passed');
