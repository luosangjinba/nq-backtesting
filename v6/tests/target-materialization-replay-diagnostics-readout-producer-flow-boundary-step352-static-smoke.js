import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const diagnosticsRuntime = await readFile(
  'v6/src/replay/target-materialization-replay-diagnostics-runtime.js',
  'utf8',
);

for (const requiredBrowserTerm of [
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.START',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP',
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-row',
  'target-history-active',
  'fallback',
  'normal-replay',
  'sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp',
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenBrowserTerm of [
  'UPDATE_SNAPSHOT',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.UPDATE_SNAPSHOT',
]) {
  assert.doesNotMatch(
    browserSmoke,
    new RegExp(forbiddenBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
}

for (const requiredPaneStatusTerm of [
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY',
  'createTargetMaterializationReplayDiagnosticsReadoutViewModel',
]) {
  assert.match(paneStatus, new RegExp(requiredPaneStatusTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenPaneStatusTerm of [
  'UPDATE_SNAPSHOT',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
  '/v4/target_bars',
  'fetchV4TargetBars',
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  '.setData(',
  '.update(',
  '.setVisibleLogicalRange(',
]) {
  assert.doesNotMatch(
    paneStatus,
    new RegExp(forbiddenPaneStatusTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
}

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

assert.match(diagnosticsRuntime, /DISPLAY_TIMEFRAME_EVENTS\.APPLIED/);
assert.match(diagnosticsRuntime, /CHART_ENTRY_MANUAL_NEXT_EVENTS\.ADVANCED/);
assert.match(diagnosticsRuntime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.STARTED/);
assert.match(diagnosticsRuntime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.TICKED/);
assert.match(diagnosticsRuntime, /CHART_ENTRY_AUTO_PLAY_EVENTS\.STOPPED/);
assert.match(diagnosticsRuntime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);

console.log('v6 target materialization replay diagnostics readout producer flow boundary step352 static smoke passed');
