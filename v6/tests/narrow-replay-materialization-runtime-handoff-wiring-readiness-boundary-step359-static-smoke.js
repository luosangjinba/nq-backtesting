import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auditSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-wiring-readiness-audit.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const planSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-plan.js',
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

for (const requiredAuditTerm of [
  'narrow-replay-materialization-runtime-handoff-wiring-readiness-audit',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'runtime registry before lifecycle start',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'runtime-command-dispatch-wrapper-with-injected-results',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'remove-app-runtime-registration',
  'remove-manual-next-advanced-subscription',
  'disable-command-dispatch-wrapper',
  'modify-manual-next-runtime',
  'route-target-bars-through-replay-runtime',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
  "sourceReplayCursorAuthority: '1m'",
]) {
  assert.match(auditSource, new RegExp(requiredAuditTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenAuditTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'emitEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(auditSource.includes(forbiddenAuditTerm), false, `Step359 audit must stay pure: ${forbiddenAuditTerm}`);
}

for (const requiredSmokeTerm of [
  "appRegistrationSurface.file, 'v6/src/app.js'",
  "eventSubscriptionSurface.eventSurface, 'chartEntryManualNext:advanced'",
  "commandDispatchWrapper.shape, 'runtime-command-dispatch-wrapper-with-injected-results'",
  "nextStep, 'narrow-replay-materialization-runtime-handoff-runtime-plan'",
  "failed.includes('ownerBoundaryPreserved')",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(appSource, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(appSource, /registry\.registerRuntime\(createDisplayTimeframeRuntime\(\)\)/);
assert.doesNotMatch(appSource, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(planSource, /narrow-replay-materialization-runtime-handoff-plan/);
assert.match(executorSource, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-wiring-readiness|createReplayCoordinationMaterializationRuntimeHandoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff wiring readiness boundary step359 static smoke passed');
