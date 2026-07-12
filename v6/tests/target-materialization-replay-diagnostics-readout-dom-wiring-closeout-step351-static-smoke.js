import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_STEP351.md',
  'utf8',
);
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const browserSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_STEP351\.md/);
assert.match(index, /controlled pane-status diagnostics readout DOM wiring/);

assert.match(todo, /Latest completed target materialization diagnostics DOM wiring step:\s+Step\s+351/);
assert.match(todo, /### Step 352 - Target Materialization Replay Diagnostics Readout Producer Flow Browser Regression/);
assert.match(todo, /### Step 351 - Target Materialization Replay Diagnostics Readout DOM Wiring/);

assert.match(handoff, /Latest completed step: Step 351 - Target Materialization Replay Diagnostics\s+Readout DOM Wiring/);
assert.match(handoff, /Step 351 implemented controlled pane-status diagnostics readout DOM wiring/);
assert.match(handoff, /start with Step 352/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(doc, /Step 349 readout view model/);
assert.match(doc, /Hidden and normal snapshots render as hidden containers with no rows/);
assert.match(doc, /target-history-active` and fallback snapshots render the collapsed/);
assert.match(doc, /Display-Timeframe, Manual Next, and Auto Play producer runtimes are not\s+modified/);
assert.match(doc, /Step 352 should verify the pane-status readout through real producer flows/);

for (const requiredPaneStatusTerm of [
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS',
  'createTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'GET_SNAPSHOT',
  'SNAPSHOT_READY',
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-row',
  'v6TargetMaterializationDiagnosticsMode',
  'v6TargetMaterializationDiagnosticsReason',
  'v6TargetMaterializationDiagnosticsPaneId',
  'v6TargetMaterializationDiagnosticsSnapshotReady',
]) {
  assert.match(paneStatus, new RegExp(requiredPaneStatusTerm));
}

for (const forbiddenPaneStatusTerm of [
  'UPDATE_SNAPSHOT',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
  '/v4/target_bars',
  'fetchV4TargetBars',
]) {
  assert.doesNotMatch(
    paneStatus,
    new RegExp(forbiddenPaneStatusTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  );
}

for (const requiredBrowserTerm of [
  'UPDATE_SNAPSHOT',
  'target-history-active',
  'fallback',
  'normal-replay',
  'sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp',
]) {
  assert.match(browserSmoke, new RegExp(requiredBrowserTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /display-timeframe-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-manual-next-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-auto-play-runtime\.js/);
assert.match(boundarySmoke, /target-materialization-replay-diagnostics/);
assert.match(boundarySmoke, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/);

console.log('v6 target materialization replay diagnostics readout dom wiring closeout step351 static smoke passed');
