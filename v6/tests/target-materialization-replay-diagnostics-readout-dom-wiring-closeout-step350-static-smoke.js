import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_PLAN_STEP350.md',
  'utf8',
);
const planSource = await readFile(
  'v6/tests/governance/helpers/shell/target-materialization-replay-diagnostics-readout-dom-wiring-plan.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js',
  'utf8',
);
const planSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-plan-step350-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_PLAN_STEP350\.md/);
assert.match(index, /plan-only pane-status DOM wiring contract/);

assert.match(todo, /Latest completed target materialization diagnostics DOM wiring plan step:\s+Step 350/);
assert.match(todo, /### Step 350 - Target Materialization Replay Diagnostics Readout DOM Wiring Plan/);

assert.match(handoff, /Step 350 defined the plan-only pane-status DOM wiring contract/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /\[data-v6-pane-status-readout\]/);
assert.match(doc, /after `\[data-v6-target-history-diagnostics\]`/);
assert.match(doc, /data-v6-target-materialization-diagnostics-mode/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(doc, /Route the snapshot through the Step 349\s+`target-materialization-replay-diagnostics-readout-view-model`/);
assert.match(doc, /Hidden view models remove row content/);
assert.match(doc, /Rollback Criteria/);
assert.match(doc, /This step is plan-only/);
assert.match(doc, /Step 351 should implement the smallest controlled DOM wiring slice/);

for (const requiredTerm of [
  'createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan',
  'validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan',
  'target-materialization-replay-diagnostics-readout-view-model',
  '[data-v6-pane-status-readout]',
  'data-v6-target-materialization-diagnostics-mode',
  'targetMaterializationReplayDiagnostics.getSnapshot',
  'targetMaterializationReplayDiagnostics:snapshotReady',
  'hidden-view-model-removes-row-content-and-sets-hidden-mode',
  'collapsed-view-model-renders-first-visible-fields-only',
  'shell-code-calls-target-bars-api',
]) {
  assert.match(planSource, new RegExp(requiredTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenTerm of [
  'registerCommand',
  'subscribeEvent',
  'dispatchCommand',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS',
  'querySelector',
  'textContent',
  'setVisibleLogicalRange',
]) {
  assert.doesNotMatch(planSource, new RegExp(forbiddenTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(planSmoke, /validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan/);
assert.match(boundarySmoke, /pane-status-readout\.js/);
assert.match(boundarySmoke, /workstation-shell\.js/);
assert.match(boundarySmoke, /display-timeframe-runtime\.js/);
assert.match(boundarySmoke, /data-v6-target-materialization-diagnostics/);
assert.match(boundarySmoke, /target_bars/);
assert.match(boundarySmoke, /updateSnapshot/);

console.log('v6 target materialization replay diagnostics readout dom wiring closeout step350 static smoke passed');
