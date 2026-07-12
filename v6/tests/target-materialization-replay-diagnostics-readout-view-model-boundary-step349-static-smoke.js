import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createTargetMaterializationReplayDiagnosticsReadoutViewModel,
  validateTargetMaterializationReplayDiagnosticsReadoutViewModel,
} from '../src/shell/target-materialization-replay-diagnostics-readout-view-model.js';

const viewModelSource = await readFile(
  'v6/src/shell/target-materialization-replay-diagnostics-readout-view-model.js',
  'utf8',
);
const viewModelSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-view-model-step349-smoke.js',
  'utf8',
);
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const workstationShell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');

const active = createTargetMaterializationReplayDiagnosticsReadoutViewModel({
  snapshot: {
    displayTimeframe: '8h',
    fallbackStatus: 'available',
    manualNextStatus: 'advanced',
    paneId: 'main',
    projectionOwner: 'runtime.bar-data',
    targetHistoryStatus: 'applied',
  },
  status: 'ready',
});
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutViewModel(active), {
  errors: [],
  valid: true,
});
assert.equal(active.mode, 'collapsed');
assert.equal(active.visible, true);

for (const requiredTerm of [
  'target-materialization-replay-diagnostics-readout-view-model',
  'createTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'validateTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan',
  'createTargetMaterializationReplayDiagnosticsSnapshot',
  'snapshot-not-ready',
  'normal-replay',
  'target-history-active',
  'fallback',
  'source 1m',
  'display input only',
]) {
  assert.ok(viewModelSource.includes(requiredTerm), `view model must document or implement ${requiredTerm}`);
}

for (const forbiddenSurface of [
  /\bregisterCommand\b/,
  /\bsubscribeEvent\b/,
  /\bemitEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS/,
  /BAR_DATA_COMMANDS/,
  /CHART_DATA_COMMANDS/,
  /CHART_VIEWPORT_COMMANDS/,
  /REPLAY_COMMANDS/,
  /\.querySelector\(/,
  /\.textContent\s*=/,
  /\.dataset\./,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
]) {
  assert.doesNotMatch(
    viewModelSource,
    forbiddenSurface,
    `readout view model must remain pure and avoid ${forbiddenSurface}`,
  );
}

assert.match(viewModelSmoke, /snapshot-not-ready/);
assert.match(viewModelSmoke, /normal-replay/);
assert.match(viewModelSmoke, /target-history-active/);
assert.match(viewModelSmoke, /fallback/);
assert.match(viewModelSmoke, /internal-only field must remain hidden/);

assert.doesNotMatch(
  paneStatus,
  /target-materialization-replay-diagnostics-readout-view-model|createTargetMaterializationReplayDiagnosticsReadoutViewModel|targetMaterializationReplayDiagnostics|getSnapshot|updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/,
);
assert.doesNotMatch(
  workstationShell,
  /data-v6-target-materialization-diagnostics|target-materialization-replay-diagnostics-readout-view-model|targetMaterializationReplayDiagnostics|\/v4\/target_bars|fetchV4TargetBars/,
);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

console.log('v6 target materialization replay diagnostics readout view model boundary step349 static smoke passed');
