import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createTargetMaterializationReplayDiagnosticsWiringPlan,
  validateTargetMaterializationReplayDiagnosticsWiringPlan,
} from './governance/helpers/replay/target-materialization-replay-diagnostics-wiring-plan.js';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const wiringPlanSource = await readFile('v6/tests/governance/helpers/replay/target-materialization-replay-diagnostics-wiring-plan.js', 'utf8');
const diagnosticsRuntime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

for (const contractSurface of [
  "APPLIED: 'displayTimeframe:applied'",
  "ADVANCED: 'chartEntryManualNext:advanced'",
  "TICKED: 'chartEntryAutoPlay:ticked'",
  "STARTED: 'chartEntryAutoPlay:started'",
  "STOPPED: 'chartEntryAutoPlay:stopped'",
  "GET_SNAPSHOT: 'targetMaterializationReplayDiagnostics.getSnapshot'",
  "SNAPSHOT_READY: 'targetMaterializationReplayDiagnostics:snapshotReady'",
]) {
  assert.ok(contracts.includes(contractSurface), `contracts must expose ${contractSurface}`);
}

const plan = createTargetMaterializationReplayDiagnosticsWiringPlan();
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsWiringPlan(plan), {
  errors: [],
  valid: true,
});
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.updateCommandReady, false);
assert.equal(plan.shellVisibleUiReady, false);
assert.equal(plan.preservesSourceReplayCursorAuthority, true);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);

for (const forbiddenRuntimeSurface of [
  /\bregisterCommand\b/,
  /\bsubscribeEvent\b/,
  /\bemitEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bXMLHttpRequest\b/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
  /REPLAY_COMMANDS\.NEXT/,
  /REPLAY_COMMANDS\.SET_CURSOR_TIME/,
  /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/,
  /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/,
  /CHART_DATA_COMMANDS\.REPLACE_BARS/,
  /CHART_DATA_COMMANDS\.APPEND_BARS/,
  /CHART_VIEWPORT_COMMANDS\.RESET_VIEW/,
]) {
  assert.doesNotMatch(
    wiringPlanSource,
    forbiddenRuntimeSurface,
    `diagnostics wiring plan source must remain pure and avoid ${forbiddenRuntimeSurface}`,
  );
}

for (const requiredPlanTerm of [
  'displayTimeframe:applied',
  'chartEntryManualNext:advanced',
  'chartEntryAutoPlay:ticked',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
  'targetMaterializationReplayDiagnostics.getSnapshot',
  'targetMaterializationReplayDiagnostics:snapshotReady',
  'runtimeBehaviorChanges: false',
  'runtimeWiringReady: false',
  'updateCommandReady: false',
  'shellVisibleUiReady: false',
  'targetHistoryRequestSizingUnchanged: true',
  'chartHistoryFastPathUnchanged: true',
]) {
  assert.ok(wiringPlanSource.includes(requiredPlanTerm), `wiring plan must document ${requiredPlanTerm}`);
}

assert.doesNotMatch(diagnosticsRuntime, /subscribeEvent|displayTimeframe:applied|chartEntryManualNext:advanced|chartEntryAutoPlay:ticked/);
assert.doesNotMatch(
  displayRuntime,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
);
assert.doesNotMatch(
  manualNextRuntime,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
);
assert.doesNotMatch(
  autoPlayRuntime,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
);

for (const shellSource of shellFiles) {
  assert.doesNotMatch(shellSource, /\/v4\/target_bars|fetchV4TargetBars|targetMaterializationReplayDiagnostics\.updateSnapshot/);
}

console.log('v6 target materialization replay diagnostics wiring boundary step343 static smoke passed');
