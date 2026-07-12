import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-browser-read-step347-smoke.js', 'utf8');
const diagnosticsRuntime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const shellFiles = await Promise.all([
  readFile('v6/src/shell/pane-status-readout.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
]);

for (const requiredBrowserTerm of [
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT',
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.START',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP',
  'displayApplyStatus',
  'manualNextStatus',
  'autoPlayStatus',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
]) {
  assert.ok(browserSmoke.includes(requiredBrowserTerm), `browser read smoke must cover ${requiredBrowserTerm}`);
}

assert.doesNotMatch(
  browserSmoke,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT|targetMaterializationReplayDiagnostics\.updateSnapshot/,
);
assert.doesNotMatch(browserSmoke, /data-v6-diagnostics|diagnostics-readout|pane-status-readout/);

assert.match(diagnosticsRuntime, /subscribeEvent/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

for (const shellSource of shellFiles) {
  assert.doesNotMatch(
    shellSource,
    /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics|\/v4\/target_bars|fetchV4TargetBars/,
  );
}

console.log('v6 target materialization replay diagnostics browser read boundary step347 static smoke passed');
