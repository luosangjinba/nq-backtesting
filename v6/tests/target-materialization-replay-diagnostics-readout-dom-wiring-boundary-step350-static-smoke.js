import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan,
  validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan,
} from './governance/helpers/shell/target-materialization-replay-diagnostics-readout-dom-wiring-plan.js';

const planSource = await readFile(
  'v6/tests/governance/helpers/shell/target-materialization-replay-diagnostics-readout-dom-wiring-plan.js',
  'utf8',
);
const planSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-plan-step350-smoke.js',
  'utf8',
);
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const workstationShell = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');

const plan = createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan();
assert.deepEqual(validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan(plan), {
  errors: [],
  valid: true,
});
assert.equal(plan.owner, 'shell.pane-status-readout');
assert.equal(plan.domVisibleUiWired, false);
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.targetHistoryRequestSizingUnchanged, true);

for (const requiredPlanTerm of [
  'targetMaterializationReplayDiagnostics.getSnapshot',
  'targetMaterializationReplayDiagnostics:snapshotReady',
  'target-materialization-replay-diagnostics-readout-view-model',
  '[data-v6-pane-status-readout]',
  'after [data-v6-target-history-diagnostics]',
  'data-v6-target-materialization-diagnostics-mode',
  'data-v6-target-materialization-diagnostics-field',
  'hidden-view-model-removes-row-content-and-sets-hidden-mode',
  'collapsed-view-model-renders-first-visible-fields-only',
  'internal-only-fields-are-never-rendered-as-rows',
  'shell-code-calls-target-bars-api',
  'shell-code-dispatches-updateSnapshot',
]) {
  assert.ok(planSource.includes(requiredPlanTerm), `DOM wiring plan must document ${requiredPlanTerm}`);
}

for (const forbiddenPlanSurface of [
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
    planSource,
    forbiddenPlanSurface,
    `DOM wiring plan must remain pure and avoid ${forbiddenPlanSurface}`,
  );
}

assert.match(planSmoke, /getSnapshot/);
assert.match(planSmoke, /snapshotReady/);
assert.match(planSmoke, /Step 349 view model/);

assert.match(paneStatus, /createTargetMaterializationReplayDiagnosticsReadoutViewModel/);
assert.doesNotMatch(paneStatus, /updateSnapshot|\/v4\/target_bars|fetchV4TargetBars/);
assert.doesNotMatch(
  workstationShell,
  /data-v6-target-materialization-diagnostics|target-materialization-replay-diagnostics-readout-dom-wiring-plan|targetMaterializationReplayDiagnostics|\/v4\/target_bars|fetchV4TargetBars/,
);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-replay-diagnostics|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

console.log('v6 target materialization replay diagnostics readout dom wiring boundary step350 static smoke passed');
