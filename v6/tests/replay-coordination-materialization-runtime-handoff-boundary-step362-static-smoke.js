import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const skeletonSource = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const contractSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-contract.js',
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

for (const requiredSkeletonTerm of [
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'collectReplayCoordinationMaterializationRuntimeHandoffCommandResults',
  'buildReplayCoordinationMaterializationRuntimeHandoffResult',
  'runtime.replay-coordination-materialization-handoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'getState',
  'start',
  'stop',
]) {
  assert.match(skeletonSource, new RegExp(requiredSkeletonTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenSkeletonTerm of [
  "from '../runtime/commands.js'",
  "from '../runtime/events.js'",
  'registerCommand(',
  'emitEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(skeletonSource.includes(forbiddenSkeletonTerm), false, `Step362 skeleton must stay unwired: ${forbiddenSkeletonTerm}`);
}

for (const requiredSmokeTerm of [
  "runtime.id, 'runtime.replay-coordination-materialization-handoff'",
  "subscribedEvent, 'chartEntryManualNext:advanced'",
  "dispatchCalls.map((call) => call.command)",
  "'chartData.replaceBars'",
  "cleanupCount, 1",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(contractSource, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(appSource, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.doesNotMatch(appSource, /createReplayCoordinationMaterializationRuntimeHandoff/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /createReplayCoordinationMaterializationRuntimeHandoff|replay-coordination-materialization-runtime-handoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 replay coordination materialization runtime handoff boundary step362 static smoke passed');
