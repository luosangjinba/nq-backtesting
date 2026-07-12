import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_VIEW_MODEL_STEP349.md',
  'utf8',
);
const viewModel = await readFile(
  'v6/src/shell/target-materialization-replay-diagnostics-readout-view-model.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js',
  'utf8',
);
const viewModelSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-view-model-step349-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_VIEW_MODEL_STEP349\.md/);
assert.match(index, /pure shell readout view model/);

assert.match(todo, /Latest completed target materialization diagnostics readout model step: Step\s+349/);
assert.match(todo, /### Step 349 - Target Materialization Replay Diagnostics Readout View Model/);

assert.match(handoff, /Step 349 added a pure shell readout view model/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /empty or not-ready snapshots become `hidden`/);
assert.match(doc, /normal replay snapshots become `hidden`/);
assert.match(doc, /target-history materialization snapshots become `collapsed`/);
assert.match(doc, /fallback snapshots become `collapsed`/);
assert.match(doc, /displayTimeframe/);
assert.match(doc, /sourceCursorAuthority/);
assert.match(doc, /This step is a pure model step/);
assert.match(doc, /Step 350 should define the controlled DOM wiring plan/);

for (const requiredTerm of [
  'createTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'validateTargetMaterializationReplayDiagnosticsReadoutViewModel',
  'snapshot-not-ready',
  'normal-replay',
  'target-history-active',
  'fallback',
  'source 1m',
  'display input only',
]) {
  assert.match(viewModel, new RegExp(requiredTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenTerm of [
  'registerCommand',
  'subscribeEvent',
  'dispatchCommand',
  'TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS',
  'querySelector',
  'textContent',
  'dataset',
  'setVisibleLogicalRange',
]) {
  assert.doesNotMatch(viewModel, new RegExp(forbiddenTerm));
}

assert.match(viewModelSmoke, /internal-only field must remain hidden/);
assert.match(viewModelSmoke, /sourceCursorAuthority/);
assert.match(boundarySmoke, /pane-status-readout\.js/);
assert.match(boundarySmoke, /workstation-shell\.js/);
assert.match(boundarySmoke, /display-timeframe-runtime\.js/);
assert.match(boundarySmoke, /target_bars/);
assert.match(boundarySmoke, /updateSnapshot/);

console.log('v6 target materialization replay diagnostics readout view model closeout step349 static smoke passed');
