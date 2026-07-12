import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePlanSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-plan.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const wiringAudit = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-wiring-readiness-audit.js',
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

for (const requiredPlanTerm of [
  'narrow-replay-materialization-runtime-handoff-runtime-plan',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'create-runtime-helper',
  'start-subscribe-manual-next',
  'handle-event-dispatch-wrapper',
  'invoke-pure-executor',
  'stop-cleanup-subscription',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'disable-runtime-registration',
  'skip-manual-next-advanced-subscription',
  'disable-dispatch-wrapper',
  'executor-fallback-preserves-current-display',
  'stop-cleans-subscription',
  'app-js-registration-now',
  'live-command-dispatch-now',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
]) {
  assert.match(runtimePlanSource, new RegExp(requiredPlanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenPlanTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'emitEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(runtimePlanSource.includes(forbiddenPlanTerm), false, `Step360 runtime plan must stay pure: ${forbiddenPlanTerm}`);
}

for (const requiredSmokeTerm of [
  "selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-contract'",
  "eventSurface,\n  'chartEntryManualNext:advanced'",
  "executorFunction, 'executeNarrowReplayMaterializationRuntimeHandoffPlan'",
  "runtimeWiringReady, false",
  "appRegistrationDeferred, true",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(wiringAudit, /narrow-replay-materialization-runtime-handoff-runtime-plan/);
assert.match(executorSource, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);
assert.match(appSource, /createTargetMaterializationReplayDiagnosticsRuntime/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-runtime-plan|createReplayCoordinationMaterializationRuntimeHandoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff runtime plan boundary step360 static smoke passed');
