import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRIDGE_WIRING_STEP374.md',
  'utf8',
);
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const smoke = await readFile(
  'v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRIDGE_WIRING_STEP374\.md/);
assert.match(index, /nativeTargetHistoryDelayMs: 100/);
assert.match(index, /8h/);

assert.match(
  todo,
  /Latest completed HTF target-history native bridge wiring step:\s+Step 374/,
);
assert.match(todo, /Step 375 - HTF Target-History Native Reduced Delay Branch Attribution/);
assert.match(todo, /### Step 374 - HTF Target-History Native Reduced Delay Bridge Wiring/);
assert.match(todo, /132\.1ms/);
assert.match(todo, /448-479ms/);

assert.match(handoff, /Step 374 wired `nativeTargetHistoryDelayMs: 100`/);
assert.match(handoff, /132\.1ms/);
assert.match(handoff, /448-479ms/);

assert.match(doc, /Status\s*\n\s*Accepted with follow-up attribution/);
assert.match(doc, /nativeTargetHistoryDelayMs/);
assert.match(doc, /Default HTF target-history native delay:[\s\S]*- `100ms`/);
assert.match(doc, /low-TF\/native source paths keep `requestDelayMs=500`/);
assert.match(doc, /existing programmatic target-history fast path stays `delayMs: 0`/);
assert.match(doc, /\| `8h` \| 132\.1ms \|/);
assert.match(doc, /\| `4h` \| 479\.2ms \|/);
assert.match(doc, /Step 375 should add targeted attribution/);

assert.match(bridge, /DEFAULT_NATIVE_TARGET_HISTORY_DELAY_MS = 100/);
assert.match(bridge, /nativeTargetHistoryDelayFor/);
assert.match(bridge, /const selectedNativeTargetHistoryDelayMs = nativeTargetHistoryDelayFor/);
assert.match(bridge, /nativeTargetHistoryDelayMs: selectedNativeTargetHistoryDelayMs/);
assert.match(bridge, /reason !== 'native-visible-range'/);
assert.match(bridge, /activationPayload\?\.targetHistory\?\.enabled/);

for (const pattern of [
  /delayMs, 100/,
  /nativeTargetHistoryDelayMs: 125/,
  /delayMs, 125/,
  /displayTimeframe: 5/,
  /delayMs, 500/,
  /DISPLAY_TIMEFRAME_EVENTS\.APPLIED/,
  /delayMs, 0/,
]) {
  assert.match(smoke, pattern);
}

assert.match(boundarySmoke, /DEFAULT_NATIVE_TARGET_HISTORY_DELAY_MS = 100/);
assert.match(boundarySmoke, /doesNotMatch\(bridge, \/registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 leftward history input bridge native target delay closeout step374 static smoke passed');
