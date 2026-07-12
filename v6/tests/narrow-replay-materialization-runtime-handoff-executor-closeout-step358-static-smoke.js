import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_EXECUTOR_STEP358.md',
  'utf8',
);
const executorSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
  'utf8',
);
const executorSmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-executor-boundary-step358-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_EXECUTOR_STEP358\.md/);
assert.match(index, /pure executor harness/);
assert.match(index, /runtime wiring\s+audit as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff executor step:\s+Step 358/);
assert.match(todo, /### Step 358 - Narrow Replay Materialization Runtime Handoff Pure Executor Harness/);
assert.match(todo, /Returned a `chartData\.replaceBars` intent with `preserveSource: true`/);
assert.match(todo, /Returned named fallback gates for source `1m`/);

assert.match(handoff, /Step 358 added the pure executor harness/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /preserveSource: true/);
assert.match(doc, /source `1m` display/);
assert.match(doc, /missing pane context/);
assert.match(doc, /missing replay cursor/);
assert.match(doc, /missing source bars/);
assert.match(doc, /target window plan unavailable/);
assert.match(doc, /target window load unavailable/);
assert.match(doc, /all target bars filtered as future bars/);
assert.match(doc, /No command bus or event bus access occurs/);
assert.match(doc, /Step 359 should audit the live runtime wiring surfaces/);

for (const requiredExecutorTerm of [
  'narrow-replay-materialization-runtime-handoff-pure-executor',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'createNarrowReplayMaterializationRuntimeHandoffPlan',
  'validateNarrowReplayMaterializationRuntimeHandoffPlan',
  'resolveTargetBarRevealState',
  'ignore-source-timeframe-display',
  'missing-pane-context',
  'missing-replay-cursor',
  'missing-source-bars',
  'target-window-plan-unavailable',
  'target-window-load-unavailable',
  'target-bars-all-future',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
  "sourceReplayCursorAuthority: '1m'",
]) {
  assert.match(executorSource, new RegExp(requiredExecutorTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenExecutorTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(
    executorSource.includes(forbiddenExecutorTerm),
    false,
    `Step358 executor must stay pure: ${forbiddenExecutorTerm}`,
  );
}

for (const requiredSmokeTerm of [
  "status, 'ready'",
  "action, 'replace-display-bars'",
  "commandSurface, 'chartData.replaceBars'",
  "fallbackGateId, 'ignore-source-timeframe-display'",
  "fallbackGateId, 'missing-pane-context'",
  "fallbackGateId, 'missing-replay-cursor'",
  "fallbackGateId, 'missing-source-bars'",
  "fallbackGateId, 'target-window-plan-unavailable'",
  "fallbackGateId, 'target-window-load-unavailable'",
  "fallbackGateId, 'target-bars-all-future'",
]) {
  assert.match(executorSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /doesNotMatch\(\s+runtimeSource,\s+\/narrow-replay-materialization-runtime-handoff-pure-executor\|executeNarrowReplayMaterializationRuntimeHandoffPlan\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 narrow replay materialization runtime handoff executor closeout step358 static smoke passed');
