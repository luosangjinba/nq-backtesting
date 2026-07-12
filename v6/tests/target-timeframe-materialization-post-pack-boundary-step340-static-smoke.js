import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selector = await readFile('v6/src/replay/target-timeframe-materialization-post-pack-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/target-timeframe-materialization-post-pack-selection-step340-smoke.js', 'utf8');
const packHelper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const step339Doc = await readFile('v6/docs/V6_TARGET_HISTORY_PACK_REPLAY_COORDINATION_MEMBER_STEP339.md', 'utf8');

for (const requiredSelectorTerm of [
  'target-materialization-replay-coordination-diagnostics-readout',
  'narrow-replay-materialization-runtime-handoff',
  'replay-coordination-pack-member-available',
  'full-eight-member-target-history-pack-preserved',
  'source-1m-replay-cursor-authority-preserved',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-behavior-change-in-selection-step',
  'route-target-bars-through-replay-runtime',
  'runtime-handoff-deferred-until-diagnostics-readout-selection',
]) {
  assert.match(selector, new RegExp(requiredSelectorTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const requiredSmokeTerm of [
  'displayMaterializationCovered: true',
  'replayCoordinationBrowserCovered: true',
  'replayCoordinationPackMemberAvailable: true',
  'packMemberRunnable: true',
  'fullEightMemberPackPreserved: true',
  'sourceReplayCursorAuthority: true',
  'targetBarsDisplayInputOnly: true',
]) {
  assert.match(selectionSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(packHelper, /TARGET_HISTORY_PACK_OPTIONAL_TESTS/);
assert.match(packHelper, /replay-coordination/);
assert.match(step339Doc, /default target-history pack remains the\s+existing eight-member browser pack/);

for (const runtimeSource of [replayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(runtimeSource, /target-materialization-replay-coordination-diagnostics-readout/);
  assert.doesNotMatch(runtimeSource, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/);
}

assert.match(displayRuntime, /LOAD_TARGET_WINDOW/);
assert.match(displayRuntime, /preserveSource:\s*true/);

for (const forbiddenSelectorTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(selector.includes(forbiddenSelectorTerm), false, `Step340 selector must stay pure: ${forbiddenSelectorTerm}`);
}

console.log('v6 target timeframe materialization post-pack boundary step340 static smoke passed');
