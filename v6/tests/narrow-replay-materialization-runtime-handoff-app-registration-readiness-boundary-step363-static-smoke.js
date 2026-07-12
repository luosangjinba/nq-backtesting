import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auditSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
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

for (const requiredAuditTerm of [
  'narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'createReplayCoordinationMaterializationRuntimeHandoff',
  './replay/replay-coordination-materialization-runtime-handoff.js',
  'after createTargetMaterializationReplayDiagnosticsRuntime import',
  'after registry.registerRuntime(createChartEntryManualNextRuntime()); before registry.registerRuntime(createChartEntryManualPreviousRuntime());',
  "import { dispatchCommand } from './runtime/commands.js';",
  "import { emitEvent, subscribeEvent } from './runtime/events.js';",
  'new-replay-coordination-materialization-handoff-app-registration-browser-smoke',
  'display-timeframe-target-materialization-replay-coordination-browser-step337-smoke',
  'target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke',
  'remove-runtime-factory-import-from-app',
  'remove-registry-registerRuntime-handoff-call',
  'preserve-unwired-step362-runtime-skeleton',
  'register-runtime-in-step363',
  'dispatch-command-in-step363',
  "runtimeBehaviorChanges: false",
  "runtimeRegistrationWired: false",
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
  assert.equal(auditSource.includes(forbiddenAuditTerm), false, `Step363 audit must stay pure: ${forbiddenAuditTerm}`);
}

for (const requiredSmokeTerm of [
  "appImportSurface.file, 'v6/src/app.js'",
  "appRegistrationSurface.factoryCall,\n  'createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand })'",
  "dependencyInjectionSource.dispatchCommand.source, 'v6/src/runtime/commands.js'",
  "nextStep, 'narrow-replay-materialization-runtime-handoff-app-registration-plan'",
  "failed.includes('ownerBoundaryPreserved')",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(appSource, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(appSource, /registry\.registerRuntime\(createChartEntryManualNextRuntime\(\)\)/);
assert.match(appSource, /registry\.registerRuntime\(createChartEntryManualPreviousRuntime\(\)\)/);
assert.doesNotMatch(appSource, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.doesNotMatch(appSource, /dispatchCommand/);

assert.match(skeletonSource, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(skeletonSource, /createNoopSubscribeEvent/);
assert.match(skeletonSource, /createMissingDispatchCommand/);
assert.doesNotMatch(skeletonSource, /from '..\/runtime\/commands\.js'|from '..\/runtime\/events\.js'/);

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
    /narrow-replay-materialization-runtime-handoff-app-registration-readiness|createReplayCoordinationMaterializationRuntimeHandoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff app registration readiness boundary step363 static smoke passed');
