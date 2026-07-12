import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRANCH_ATTRIBUTION_STEP375.md',
  'utf8',
);
const bridge = await readFile('v6/src/chart-history/leftward-history-input-bridge.js', 'utf8');
const browserSmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js',
  'utf8',
);

assert.match(index, /V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRANCH_ATTRIBUTION_STEP375\.md/);
assert.match(index, /native `100ms` branch is present/);
assert.match(index, /runtime-originated `500ms` schedules/);

assert.match(todo, /Latest completed HTF target-history schedule attribution step:\s+Step 375/);
assert.match(todo, /### Step 376 - HTF Target-History Runtime Delayed-Schedule Suppression/);
assert.match(todo, /### Step 375 - HTF Target-History Native Reduced Delay Branch Attribution/);
assert.match(todo, /runtime-surface-check/);
assert.match(todo, /runtime-left-extension-loaded/);
assert.match(todo, /130\.1ms/);
assert.match(todo, /roughly `500ms` window/);

assert.match(handoff, /Worktree at handoff: clean after Step 375 closeout/);
assert.match(handoff, /Latest completed step: Step 375 - HTF Target-History Native Reduced Delay\s+Branch Attribution/);
assert.match(handoff, /start with Step 376/);
assert.match(handoff, /Recommended next action is Step 376/);
assert.match(handoff, /runtime-surface-check/);
assert.match(handoff, /runtime-left-extension-loaded/);
assert.match(handoff, /130\.1ms/);

assert.match(doc, /Status\s*\n\s*Accepted with follow-up scheduling fix/);
assert.match(doc, /__v6LeftwardHistoryInputBridgeTrace/);
assert.match(doc, /\| `4h` \| `463\.3ms` \|/);
assert.match(doc, /\| `8h` \| `130\.1ms` \|/);
assert.match(doc, /\| `1D` \| `464\.0ms` \|/);
assert.match(doc, /\| `1W` \| `462\.6ms` \|/);
assert.match(doc, /Step 374 did wire the native target-history reduced-delay branch correctly/);
assert.match(doc, /Step 376 Recommendation/);

assert.match(bridge, /__v6LeftwardHistoryInputBridgeTrace/);
assert.match(bridge, /phase: 'schedule-resolved'/);
assert.match(bridge, /phase: 'timer-scheduled'/);
assert.match(bridge, /activationDisplayTimeframe/);
assert.match(bridge, /nativeTargetHistoryDelayMs/);
assert.doesNotMatch(bridge, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);

assert.match(browserSmoke, /bridgeTraceLog/);
assert.match(browserSmoke, /inputToScheduleResolvedMs/);
assert.match(browserSmoke, /inputToTimerScheduledMs/);
assert.match(browserSmoke, /scheduleTrace/);
assert.match(browserSmoke, /native-target-history-reduced-delay/);
assert.match(browserSmoke, /mode === 'delayed'/);
assert.match(browserSmoke, /delayMs === 500/);

console.log('v6 leftward history input bridge schedule branch attribution closeout step375 static smoke passed');
