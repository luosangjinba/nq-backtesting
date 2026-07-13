import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const planSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-plan.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js',
  'utf8',
);
const readinessAudit = await readFile(
  'v6/tests/governance/helpers/replay/narrow-replay-materialization-runtime-handoff-readiness-audit.js',
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
  'narrow-replay-materialization-runtime-handoff-plan',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'ignore-source-timeframe-display',
  'missing-pane-context',
  'missing-replay-cursor',
  'missing-source-bars',
  'target-window-plan-unavailable',
  'target-window-load-unavailable',
  'target-bars-all-future',
  'runtimeBehaviorChanges: false',
  'runtimeWiringReady: false',
  "sourceReplayCursorAuthority: '1m'",
  'targetBarsDisplayMaterializationInputOnly: true',
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
  assert.equal(planSource.includes(forbiddenPlanTerm), false, `Step357 plan must stay pure: ${forbiddenPlanTerm}`);
}

for (const requiredSmokeTerm of [
  "eventSurface, 'chartEntryManualNext:advanced'",
  "ownerBoundary, 'runtime.replay-coordination-materialization-handoff'",
  "ownerModule, 'replay-coordination-materialization-runtime-handoff'",
  "runtimeBehaviorChanges, false",
  "runtimeWiringReady, false",
  "sourceReplayCursorAuthority, '1m'",
  "targetBarsDisplayMaterializationInputOnly, true",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(readinessAudit, /nextStep:\s*'narrow-replay-materialization-runtime-handoff-plan'/);
assert.match(manualNextRuntime, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, displayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-plan|runtime\.replay-coordination-materialization-handoff/,
  );
}

assert.doesNotMatch(replayRuntime, /PLAN_TARGET_WINDOW|LOAD_TARGET_WINDOW|REPLACE_BARS/);

console.log('v6 narrow replay materialization runtime handoff plan boundary step357 static smoke passed');
