import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_VISIBLE_RANGE_REDUCED_DELAY_RESOLVER_STEP373.md',
  'utf8',
);
const resolver = await readFile('v6/src/chart-history/leftward-history-request-schedule.js', 'utf8');
const smoke = await readFile('v6/tests/leftward-history-request-schedule-step373-smoke.js', 'utf8');
const boundarySmoke = await readFile(
  'v6/tests/leftward-history-request-schedule-boundary-step373-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_TARGET_HISTORY_NATIVE_VISIBLE_RANGE_REDUCED_DELAY_RESOLVER_STEP373\.md/);
assert.match(index, /nativeTargetHistoryDelayMs/);
assert.match(index, /100ms/);

assert.match(
  todo,
  /Latest completed HTF target-history reduced-delay resolver step:\s+Step 373/,
);
assert.match(todo, /### Step 374 - HTF Target-History Native Reduced Delay Bridge Wiring/);
assert.match(todo, /### Step 373 - HTF Target-History Native Visible-Range Reduced Delay Resolver/);
assert.match(todo, /nativeTargetHistoryDelayMs: 100/);

assert.match(handoff, /Worktree at handoff: clean after Step 373 closeout/);
assert.match(
  handoff,
  /Latest completed step: Step 373 - HTF Target-History Native Visible-Range\s+Reduced Delay Resolver/,
);
assert.match(handoff, /start with Step 374/);
assert.match(handoff, /Recommended next action is Step 374/);
assert.match(handoff, /nativeTargetHistoryDelayMs: 100/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /native-target-history-reduced-delay-with-coalescing/);
assert.match(doc, /nativeTargetHistoryDelayMs: 100/);
assert.match(doc, /delayMs: 100/);
assert.match(doc, /requestDelayMs=500/);
assert.match(doc, /Existing programmatic target-history fast path stays `delayMs: 0`/);
assert.match(doc, /bridge remains\s+unwired/);
assert.match(doc, /Step 374 should wire the selected delay/);

assert.match(resolver, /nativeTargetHistoryDelayMs = null/);
assert.match(resolver, /native-target-history-reduced-delay/);
assert.match(resolver, /native-target-history-reduced-delay-with-coalescing/);
assert.match(resolver, /programmatic-target-history-fast-path/);

for (const pattern of [
  /nativeTargetHistoryDelayMs: 100/,
  /delayMs: 100/,
  /lowTimeframeNativeDelay/,
  /targetHistoryEnabled: false/,
  /programmaticFastPath/,
  /delayMs: 0/,
]) {
  assert.match(smoke, pattern);
}

assert.match(boundarySmoke, /doesNotMatch\(bridge, \/nativeTargetHistoryDelayMs\|native-target-history-reduced-delay-with-coalescing/);
assert.match(boundarySmoke, /doesNotMatch\(resolver, \/dispatchCommand\|subscribeEvent\|setTimeoutFn\|clearTimeoutFn\|registerCommand\|registerRuntime\|UPDATE_SNAPSHOT/);

console.log('v6 leftward history request schedule closeout step373 static smoke passed');
