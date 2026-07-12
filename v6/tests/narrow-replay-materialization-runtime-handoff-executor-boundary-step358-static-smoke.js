import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const executorSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
  'utf8',
);
const executorSmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js',
  'utf8',
);
const step357Plan = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-plan.js',
  'utf8',
);
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const diagnosticsRuntime = await readFile(
  'v6/src/replay/target-materialization-replay-diagnostics-runtime.js',
  'utf8',
);
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');

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
  'targetBarsDisplayMaterializationInputOnly: true',
]) {
  assert.match(executorSource, new RegExp(requiredExecutorTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenExecutorTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'emitEvent(',
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
  "fallbackGateId, 'ignore-source-timeframe-display'",
  "fallbackGateId, 'missing-pane-context'",
  "fallbackGateId, 'missing-replay-cursor'",
  "fallbackGateId, 'missing-source-bars'",
  "fallbackGateId, 'target-window-plan-unavailable'",
  "fallbackGateId, 'target-window-load-unavailable'",
  "fallbackGateId, 'target-bars-all-future'",
  "commandSurface, 'chartData.replaceBars'",
  "sourceReplayCursorAuthority, '1m'",
]) {
  assert.match(executorSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step357Plan, /narrow-replay-materialization-runtime-handoff-plan/);
assert.match(manualNextRuntime, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-pure-executor|executeNarrowReplayMaterializationRuntimeHandoffPlan/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff executor boundary step358 static smoke passed');
