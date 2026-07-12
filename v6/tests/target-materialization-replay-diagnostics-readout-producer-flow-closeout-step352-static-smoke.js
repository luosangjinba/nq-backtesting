import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_PRODUCER_FLOW_STEP352.md',
  'utf8',
);
const browserSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_PRODUCER_FLOW_STEP352\.md/);
assert.match(index, /real Display-Timeframe, Manual\s+Next, and Auto Play producer flows update the pane-status/);

assert.match(todo, /Latest completed target materialization diagnostics readout producer-flow\s+step:\s+Step 352/);
assert.match(todo, /### Step 353 - Target Materialization Replay Diagnostics Readout Producer Flow Pack Member/);
assert.match(todo, /### Step 352 - Target Materialization Replay Diagnostics Readout Producer Flow Browser Regression/);

assert.match(handoff, /Latest completed step: Step 352 - Target Materialization Replay Diagnostics\s+Readout Producer Flow Browser Regression/);
assert.match(handoff, /Step 352 added browser\/static regression coverage proving real\s+Display-Timeframe materialization, Manual Next, and Auto Play producer/);
assert.match(handoff, /start with Step 353/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(doc, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(doc, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.match(doc, /does not directly dispatch\s+`targetMaterializationReplayDiagnostics\.updateSnapshot`/);
assert.match(doc, /Real Display-Timeframe materialization renders a collapsed\s+`target-history-active` readout/);
assert.match(doc, /Empty target bars render a collapsed fallback readout/);
assert.match(doc, /Returning to normal `1m` replay hides the materialization readout/);
assert.match(doc, /Internal-only fields/);
assert.match(doc, /Step 353 should add the Step 352 browser smoke as an optional focused member/);

for (const requiredBrowserTerm of [
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.START',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP',
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

assert.match(boundarySmoke, /display-timeframe-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-manual-next-runtime\.js/);
assert.match(boundarySmoke, /chart-entry-auto-play-runtime\.js/);
assert.match(boundarySmoke, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);
assert.match(boundarySmoke, /forbiddenBrowserTerm/);

console.log('v6 target materialization replay diagnostics readout producer flow closeout step352 static smoke passed');
