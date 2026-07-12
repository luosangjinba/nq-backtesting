import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const workstationShell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const browserSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js',
  'utf8',
);
const unitSmoke = await readFile('v6/tests/pane-status-readout-step183-smoke.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');

for (const requiredPaneStatusTerm of [
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS',
  'createTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-row',
  'v6TargetMaterializationDiagnosticsMode',
  'v6TargetMaterializationDiagnosticsReason',
  'v6TargetMaterializationDiagnosticsPaneId',
  'v6TargetMaterializationDiagnosticsSnapshotReady',
  'GET_SNAPSHOT',
  'SNAPSHOT_READY',
]) {
  assert.match(paneStatus, new RegExp(requiredPaneStatusTerm));
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
  assert.doesNotMatch(paneStatus, new RegExp(forbiddenPaneStatusTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.doesNotMatch(
  workstationShell,
  /data-v6-target-materialization-diagnostics|targetMaterializationReplayDiagnostics|\/v4\/target_bars|fetchV4TargetBars/,
);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

for (const requiredBrowserTerm of [
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-row',
  'UPDATE_SNAPSHOT',
  'target-history-active',
  'fallback',
  'normal-replay',
  'sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp',
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(unitSmoke, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS\.SNAPSHOT_READY/);
assert.match(unitSmoke, /sourceCursorAuthority/);
assert.match(unitSmoke, /targetBarsDisplayInputOnly/);

console.log('v6 target materialization replay diagnostics readout dom wiring boundary step351 static smoke passed');
