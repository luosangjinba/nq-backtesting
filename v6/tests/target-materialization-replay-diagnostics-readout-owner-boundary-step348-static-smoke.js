import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan,
  validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan,
} from '../src/replay/target-materialization-replay-diagnostics-readout-owner-plan.js';

const planSource = await readFile('v6/src/replay/target-materialization-replay-diagnostics-readout-owner-plan.js', 'utf8');
const smoke = await readFile('v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js', 'utf8');
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const workstationShell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');

const plan = createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan();
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan(plan), {
  errors: [],
  valid: true,
});
assert.equal(plan.owner, 'shell.pane-status-readout');
assert.equal(plan.placement.mode, 'developer-collapsed-pane-status-readout');
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.shellVisibleUiReady, false);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);
assert.equal(plan.chartHistoryFastPathUnchanged, true);

for (const requiredPlanTerm of [
  'targetMaterializationReplayDiagnostics.getSnapshot',
  'targetMaterializationReplayDiagnostics:snapshotReady',
  'developer-collapsed-pane-status-readout',
  'hidden-by-default-for-normal-replay',
  'collapsed-unless-target-history-active-or-fallback',
  'pane-local-only',
  'displayTimeframe',
  'targetHistoryStatus',
  'projectionOwner',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
]) {
  assert.ok(planSource.includes(requiredPlanTerm), `readout plan must document ${requiredPlanTerm}`);
}

for (const forbiddenPlanSurface of [
  /\bregisterCommand\b/,
  /\bsubscribeEvent\b/,
  /\bemitEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/,
  /BAR_DATA_COMMANDS/,
  /CHART_DATA_COMMANDS/,
  /CHART_VIEWPORT_COMMANDS/,
  /REPLAY_COMMANDS/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
]) {
  assert.doesNotMatch(
    planSource,
    forbiddenPlanSurface,
    `readout owner plan must remain pure and avoid ${forbiddenPlanSurface}`,
  );
}

assert.match(smoke, /validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan/);
assert.match(smoke, /sourceCursorAuthority/);

assert.doesNotMatch(
  paneStatus,
  /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics|getSnapshot|updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/,
);
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

console.log('v6 target materialization replay diagnostics readout owner boundary step348 static smoke passed');
