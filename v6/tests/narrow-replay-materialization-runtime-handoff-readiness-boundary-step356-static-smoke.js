import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const auditSource = await readFile(
  'v6/tests/governance/helpers/replay/narrow-replay-materialization-runtime-handoff-readiness-audit.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js',
  'utf8',
);
const step355Doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_DIAGNOSTICS_READOUT_CHAIN_SELECTION_STEP355.md',
  'utf8',
);
const pureHandoffPlan = await readFile(
  'v6/src/replay/replay-coordination-materialization-pure-handoff-plan.js',
  'utf8',
);
const ownerContract = await readFile(
  'v6/src/replay/replay-coordination-materialization-owner-contract.js',
  'utf8',
);
const displayHandoff = await readFile(
  'v6/src/display-timeframe/display-timeframe-target-materialization-handoff.js',
  'utf8',
);
const targetDisplayMaterialization = await readFile(
  'v6/src/materialization/target-display-materialization.js',
  'utf8',
);
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const diagnosticsRuntime = await readFile(
  'v6/src/replay/target-materialization-replay-diagnostics-runtime.js',
  'utf8',
);
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');

for (const requiredAuditTerm of [
  'narrow-replay-materialization-runtime-handoff-readiness-audit',
  'runtime.replay-coordination-materialization-handoff',
  'new-replay-coordination-runtime-helper',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'REPLAY_COMMANDS.GET_STATE',
  'PANE_COMMANDS.GET_BY_ID',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'replay.setCursorTime',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
  'display-timeframe-runtime-remains-tf-switch-owner',
  'diagnostics-runtime-remains-read-only-observability',
  'narrow-replay-materialization-runtime-handoff-plan',
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
  assert.equal(auditSource.includes(forbiddenAuditTerm), false, `Step356 audit must stay pure: ${forbiddenAuditTerm}`);
}

for (const requiredSmokeTerm of [
  "selectedOwner, 'new-replay-coordination-runtime-helper'",
  "boundary, 'runtime.replay-coordination-materialization-handoff'",
  "allowedEventSurfaces.includes('chartEntryManualNext:advanced')",
  "allowedCommandSurfaces.includes('replay.getState')",
  "allowedCommandSurfaces.includes('barData.planTargetWindow')",
  "allowedCommandSurfaces.includes('chartData.replaceBars')",
  "forbiddenSurfaces.includes('replay.setCursorTime')",
  "nextStep, 'narrow-replay-materialization-runtime-handoff-plan'",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step355Doc, /narrow-replay-materialization-runtime-handoff-readiness-audit/);
assert.match(pureHandoffPlan, /display-timeframe-target-materialization-handoff/);
assert.match(pureHandoffPlan, /target-window-plan/);
assert.match(pureHandoffPlan, /target-window-load/);
assert.match(pureHandoffPlan, /display-bars-apply/);
assert.match(ownerContract, /source-1m-replay-cursor-authority/);
assert.match(ownerContract, /target-bars-display-materialization-input-only/);
assert.match(displayHandoff, /resolveDisplayTimeframeTargetMaterializationHandoff/);
assert.match(targetDisplayMaterialization, /resolveTargetBarRevealState/);

assert.match(displayRuntime, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(displayRuntime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /preserveSource:\s*true/);

assert.match(manualNextRuntime, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);

for (const runtimeSource of [manualNextRuntime, autoPlayRuntime, diagnosticsRuntime, replayRuntime]) {
  assert.doesNotMatch(
    runtimeSource,
    /narrow-replay-materialization-runtime-handoff-readiness|runtime\.replay-coordination-materialization-handoff/,
  );
}

assert.doesNotMatch(replayRuntime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);

console.log('v6 narrow replay materialization runtime handoff readiness boundary step356 static smoke passed');
