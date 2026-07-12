import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const app = await readFile('v6/src/app.js', 'utf8');
const contract = await readFile('v6/src/replay/target-materialization-replay-diagnostics-contract.js', 'utf8');
const runtimeSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

assert.match(contracts, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/);
assert.match(contracts, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(contracts, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS/);
assert.match(contracts, /targetMaterializationReplayDiagnostics:snapshotReady/);

assert.match(runtime, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(runtime, /registerCommand\(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(runtime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS\.SNAPSHOT_READY/);
assert.match(runtime, /createTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(runtime, /validateTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(runtime, /cloneSnapshot/);
assert.doesNotMatch(runtime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars|REPLAY_COMMANDS\.NEXT|REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.doesNotMatch(runtime, /CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS|setData\(|setVisibleLogicalRange\(/);

assert.match(app, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(app, /registry\.registerRuntime\(createTargetMaterializationReplayDiagnosticsRuntime\(\)\)/);

assert.match(contract, /runtimeCommandReady:\s*false/);
assert.match(contract, /runtimeWiringReady:\s*false/);
assert.match(runtimeSmoke, /GET_SNAPSHOT/);
assert.match(runtimeSmoke, /SNAPSHOT_READY/);
assert.match(runtimeSmoke, /status:\s*'idle'/);

for (const source of [displayRuntime, manualNextRuntime, autoPlayRuntime, replayRuntime]) {
  assert.doesNotMatch(source, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|createTargetMaterializationReplayDiagnosticsSnapshot/);
}

for (const source of [manualNextRuntime, autoPlayRuntime, replayRuntime]) {
  assert.doesNotMatch(source, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
}

for (const shellSource of shellFiles) {
  assert.doesNotMatch(shellSource, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|fetchV4TargetBars|\/v4\/target_bars/);
}

console.log('v6 target materialization replay diagnostics runtime boundary step342 static smoke passed');
