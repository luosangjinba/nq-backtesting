import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_RUNTIME_DELAYED_SCHEDULE_SUPPRESSION_STEP376.md',
  'utf8',
);
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const fastPathSmoke = await readFile('v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js', 'utf8');

assert.match(index, /V6_HTF_TARGET_HISTORY_RUNTIME_DELAYED_SCHEDULE_SUPPRESSION_STEP376\.md/);
assert.match(index, /runtime-surface-check/);
assert.match(index, /runtime-left-extension-loaded/);
assert.match(index, /reduced-delay window/);

assert.match(todo, /Latest completed HTF target-history runtime suppression step:\s+Step 376/);
assert.match(todo, /### Step 377 - HTF Target-History Reduced-Delay Browser Budget Guard/);
assert.match(todo, /### Step 376 - HTF Target-History Runtime Delayed-Schedule Suppression/);
assert.match(todo, /`4h` `113\.3ms`/);
assert.match(todo, /`8h` `121\.4ms`/);
assert.match(todo, /`1D` `125\.7ms`/);
assert.match(todo, /`1W` `120\.4ms`/);

assert.match(handoff, /Worktree at handoff: clean after Step 376 closeout/);
assert.match(handoff, /Latest completed step: Step 376 - HTF Target-History Runtime\s+Delayed-Schedule Suppression/);
assert.match(handoff, /start with Step 377/);
assert.match(handoff, /Recommended next action is Step 377/);
assert.match(handoff, /`4h` `113\.3ms`/);
assert.match(handoff, /`1W` `120\.4ms`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /phase: 'schedule-suppressed'/);
assert.match(doc, /\| `4h` \| `113\.3ms` \|/);
assert.match(doc, /\| `8h` \| `121\.4ms` \|/);
assert.match(doc, /\| `1D` \| `125\.7ms` \|/);
assert.match(doc, /\| `1W` \| `120\.4ms` \|/);
assert.match(doc, /Step 377 Recommendation/);

assert.match(bridge, /isRuntimeTargetHistoryDelayedSchedule/);
assert.match(bridge, /shouldPreserveNativeTargetHistoryPending/);
assert.match(bridge, /phase: 'schedule-suppressed'/);
assert.match(bridge, /schedule\.reason === 'runtime-surface-check'/);
assert.match(bridge, /schedule\.reason === 'runtime-left-extension-loaded'/);
assert.doesNotMatch(bridge, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);

assert.match(fastPathSmoke, /assert\.equal\(timers\.length, 1\);\s+dispatches\.length = 0/);
assert.match(fastPathSmoke, /displayTimeframe = 5/);
assert.match(fastPathSmoke, /timers\[1\]\.delayMs, 500/);

console.log('v6 leftward history input bridge runtime delayed suppression closeout step376 static smoke passed');
