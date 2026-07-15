import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planSource = await readFile(
  'v6/tests/governance/helpers/replay/narrow-replay-materialization-runtime-handoff-app-registration-plan.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js',
  'utf8',
);
const runtimeManifest = await readFile('v6/src/runtime/replay-pipeline-runtime-contributions.js', 'utf8');
const readinessAuditSource = await readFile(
  'v6/tests/governance/helpers/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js',
  'utf8',
);
const skeletonSource = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const manualPreviousRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-previous-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const diagnosticsRuntime = await readFile(
  'v6/src/replay/target-materialization-replay-diagnostics-runtime.js',
  'utf8',
);
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');

for (const requiredPlanTerm of [
  'narrow-replay-materialization-runtime-handoff-app-registration-plan',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'createNarrowReplayMaterializationRuntimeHandoffAppRegistrationReadinessAudit',
  'add-dispatch-command-import',
  'add-runtime-factory-import',
  'register-runtime-after-manual-next',
  './runtime/commands.js',
  './replay/replay-coordination-materialization-runtime-handoff.js',
  'registry.registerRuntime(createChartEntryManualNextRuntime());',
  'registry.registerRuntime(createChartEntryManualPreviousRuntime());',
  'registry.registerRuntime(createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand }));',
  'replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'remove-dispatch-command-import-from-app-if-unused',
  'remove-runtime-registration-call-from-app',
  'modify-app-js-in-step364',
  'register-runtime-in-step364',
  "appJsChangesNow: false",
  "runtimeBehaviorChanges: false",
  "runtimeRegistrationWired: false",
  "sourceReplayCursorAuthority: '1m'",
]) {
  assert.match(planSource, new RegExp(requiredPlanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
  assert.equal(planSource.includes(forbiddenPlanTerm), false, `Step364 plan must stay pure: ${forbiddenPlanTerm}`);
}

for (const requiredSmokeTerm of [
  "selectedNextStep,\n  'replay-coordination-materialization-runtime-handoff-app-registration'",
  "appJsChangesNow, false",
  "runtimeRegistrationWired, false",
  "focusedBrowserSmokePlan.file,\n  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js'",
  "forbiddenPlanActions.includes('register-runtime-in-step364')",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(readinessAuditSource, /narrow-replay-materialization-runtime-handoff-app-registration-plan/);
assert.match(skeletonSource, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(runtimeManifest, /createChartEntryManualNextRuntime\(\),/);
assert.match(runtimeManifest, /createChartEntryManualPreviousRuntime\(\),/);

for (const runtimeSource of [
  manualNextRuntime,
  manualPreviousRuntime,
  autoPlayRuntime,
  displayRuntime,
  diagnosticsRuntime,
  replayRuntime,
]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-app-registration-plan|createReplayCoordinationMaterializationRuntimeHandoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff app registration plan boundary step364 static smoke passed');
