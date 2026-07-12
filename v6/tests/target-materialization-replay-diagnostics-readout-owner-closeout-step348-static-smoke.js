import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_OWNER_PLAN_STEP348.md',
  'utf8',
);
const planSource = await readFile(
  'v6/src/replay/target-materialization-replay-diagnostics-readout-owner-plan.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-owner-boundary-step348-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_OWNER_PLAN_STEP348\.md/);
assert.match(index, /shell\.pane-status-readout/);
assert.match(index, /developer-collapsed pane-local/);

assert.match(todo, /Latest completed target materialization diagnostics readout owner step: Step\s+348/);
assert.match(todo, /### Step 348 - Target Materialization Replay Diagnostics Readout Owner Plan/);

assert.match(handoff, /Step 348 selected `shell\.pane-status-readout`/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /shell\.pane-status-readout/);
assert.match(doc, /developer-collapsed-pane-status-readout/);
assert.match(doc, /First Visible Fields/);
assert.match(doc, /Internal-Only Fields/);
assert.match(doc, /Visibility Rules/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(doc, /This step is plan-only/);
assert.match(doc, /Step 349 should build a pure diagnostics readout view-model/);

for (const visibleField of [
  'displayTimeframe',
  'targetHistoryStatus',
  'projectionOwner',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
]) {
  assert.match(planSource, new RegExp(`'${visibleField}'`));
}

for (const internalOnlyField of [
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
]) {
  assert.match(planSource, new RegExp(`'${internalOnlyField}'`));
}

assert.match(planSource, /shellVisibleUiReady: false/);
assert.match(planSource, /targetHistoryRequestSizingUnchanged: true/);
assert.match(planSource, /chartHistoryFastPathUnchanged: true/);
assert.match(planSource, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(planSource, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(planSource, /dispatch replay\.next/);
assert.match(planSource, /dispatch chartData\.replaceBars/);

assert.match(boundarySmoke, /pane-status-readout\.js/);
assert.match(boundarySmoke, /workstation-shell\.js/);
assert.match(boundarySmoke, /display-timeframe-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-manual-next-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-auto-play-runtime\.js/);
assert.match(boundarySmoke, /target_bars/);
assert.match(boundarySmoke, /updateSnapshot/);

console.log('v6 target materialization replay diagnostics readout owner closeout step348 static smoke passed');
