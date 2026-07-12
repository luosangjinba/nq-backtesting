import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contractSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-contract.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const runtimePlan = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-plan.js',
  'utf8',
);
const executorSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js',
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

for (const requiredContractTerm of [
  'narrow-replay-materialization-runtime-handoff-runtime-contract',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'dispatchCommand',
  'subscribeEvent',
  'no-op-until-runtime-wiring',
  'runtime-contract-accepted',
  'runtime-plan-accepted',
  'pure-executor-accepted',
  'wiring-readiness-audit-accepted',
  'app-registration-step-selected',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'register-runtime-now',
  'subscribe-event-now',
  'dispatch-command-now',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
]) {
  assert.match(contractSource, new RegExp(requiredContractTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenContractTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'emitEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(contractSource.includes(forbiddenContractTerm), false, `Step361 contract must stay pure: ${forbiddenContractTerm}`);
}

for (const requiredSmokeTerm of [
  "factorySignature.name, 'createReplayCoordinationMaterializationRuntimeHandoff'",
  "executor: 'executeNarrowReplayMaterializationRuntimeHandoffPlan'",
  "mode: 'no-op-until-runtime-wiring'",
  "selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-skeleton'",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(runtimePlan, /narrow-replay-materialization-runtime-handoff-runtime-contract/);
assert.match(executorSource, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);
assert.match(appSource, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.doesNotMatch(appSource, /createReplayCoordinationMaterializationRuntimeHandoff/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-runtime-contract|createReplayCoordinationMaterializationRuntimeHandoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff runtime contract boundary step361 static smoke passed');
