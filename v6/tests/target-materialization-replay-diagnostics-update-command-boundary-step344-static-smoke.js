import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const updateSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(contracts, /UPDATE_SNAPSHOT:\s*'targetMaterializationReplayDiagnostics\.updateSnapshot'/);
assert.match(runtime, /registerCommand\(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);
assert.match(runtime, /function updateSnapshot/);
assert.match(runtime, /validateTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(runtime, /createTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(runtime, /status:\s*'rejected'/);
assert.match(runtime, /rejectedSnapshot/);
assert.match(updateSmoke, /invalid updates do not corrupt|rejectedSnapshot|afterRejected/s);

for (const forbiddenRuntimeSurface of [
  /\bsubscribeEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
  /displayTimeframe:applied/,
  /chartEntryManualNext:advanced/,
  /chartEntryAutoPlay:ticked/,
  /CHART_ENTRY_MANUAL_NEXT_COMMANDS/,
  /CHART_ENTRY_AUTO_PLAY_COMMANDS/,
  /DISPLAY_TIMEFRAME_COMMANDS/,
  /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/,
  /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/,
  /CHART_DATA_COMMANDS\.REPLACE_BARS/,
  /CHART_DATA_COMMANDS\.APPEND_BARS/,
  /CHART_VIEWPORT_COMMANDS/,
  /REPLAY_COMMANDS\.NEXT/,
  /REPLAY_COMMANDS\.SET_CURSOR_TIME/,
]) {
  assert.doesNotMatch(
    runtime,
    forbiddenRuntimeSurface,
    `diagnostics update command must not use ${forbiddenRuntimeSurface}`,
  );
}

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

for (const shellSource of shellFiles) {
  assert.doesNotMatch(
    shellSource,
    /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT|targetMaterializationReplayDiagnostics\.updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/,
  );
}

console.log('v6 target materialization replay diagnostics update command boundary step344 static smoke passed');
