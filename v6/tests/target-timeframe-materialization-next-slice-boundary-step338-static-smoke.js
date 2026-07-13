import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selector = await readFile('v6/tests/governance/helpers/replay/target-timeframe-materialization-next-slice-selection.js', 'utf8');
const selectionSmoke = await readFile('v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js', 'utf8');
const targetHistoryPackHelper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const targetHistoryPack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');

for (const requiredSelectorTerm of [
  'target-history-pack-replay-coordination-member',
  'target-materialization-diagnostics-readout',
  'narrow-replay-materialization-runtime-handoff',
  'source-1m-replay-cursor-authority-preserved',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-behavior-change-in-selection-step',
  'route-target-bars-through-replay-runtime',
  'test-harness.target-history-pack',
  'pack-env-selection-regresses',
]) {
  assert.match(selector, new RegExp(requiredSelectorTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const requiredSmokeTerm of [
  'displayApplyCovered: true',
  'manualNextCovered: true',
  'autoPlayCovered: true',
  'fallbackCovered: true',
  'packMemberControlsAvailable: true',
  'sourceReplayCursorAuthority: true',
  'targetBarsDisplayInputOnly: true',
  'target-history-pack-replay-coordination-member',
  'runtime-handoff-deferred-until-pack-integration-or-readout',
]) {
  assert.match(selectionSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(targetHistoryPackHelper, /TARGET_HISTORY_PACK_MEMBERS/);
assert.match(targetHistoryPackHelper, /selectTargetHistoryPackTests/);
assert.match(targetHistoryPack, /createTargetHistoryPackPlanFromEnv/);
assert.match(targetHistoryPack, /plan\.scripts/);

for (const runtimeSource of [replayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(runtimeSource, /target-history-pack-replay-coordination-member|target-materialization-diagnostics-readout/);
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
  assert.equal(selector.includes(forbiddenSelectorTerm), false, `Step338 selector must stay pure: ${forbiddenSelectorTerm}`);
}

console.log('v6 target timeframe materialization next slice boundary step338 static smoke passed');
