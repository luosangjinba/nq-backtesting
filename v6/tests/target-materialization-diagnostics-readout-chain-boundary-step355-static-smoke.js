import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selector = await readFile(
  'v6/src/replay/target-materialization-diagnostics-readout-chain-selection.js',
  'utf8',
);
const selectionSmoke = await readFile(
  'v6/tests/target-materialization-diagnostics-readout-chain-selection-step355-smoke.js',
  'utf8',
);
const step337Smoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'utf8',
);
const step352Smoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const step354Smoke = await readFile(
  'v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js',
  'utf8',
);
const paneStatus = await readFile('v6/src/shell/pane-status-readout.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const manualNextRuntime = await readFile('v6/src/chart-entry/chart-entry-manual-next-runtime.js', 'utf8');
const autoPlayRuntime = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const packHelper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');

for (const requiredSelectorTerm of [
  'narrow-replay-materialization-runtime-handoff-readiness-audit',
  'narrow-replay-materialization-runtime-handoff',
  'more-diagnostics-readout-pack-wiring',
  'step337-replay-coordination-browser-covered',
  'step352-producer-flow-readout-browser-covered',
  'step354-combination-pack-covered',
  'source-1m-replay-cursor-authority-preserved',
  'target-bars-display-input-only',
  'no-direct-update-snapshot-in-producer-flow-browser',
  'shell-consumption-command-event-only',
  'producer-runtimes-unchanged',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'route-target-bars-through-replay-runtime',
]) {
  assert.match(selector, new RegExp(requiredSelectorTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenSelectorTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
  'LOAD_TARGET_WINDOW',
  'PLAN_TARGET_WINDOW',
]) {
  assert.equal(selector.includes(forbiddenSelectorTerm), false, `Step355 selector must stay pure: ${forbiddenSelectorTerm}`);
}

for (const requiredSmokeTerm of [
  'combinationPackCovered: true',
  'producerFlowReadoutCovered: true',
  'replayCoordinationPackCovered: true',
  'shellConsumptionCommandEventOnly: true',
  'sourceReplayCursorAuthority: true',
  'targetBarsDisplayInputOnly: true',
  'narrow-replay-materialization-runtime-handoff-readiness-audit',
  'runtime-handoff-deferred-until-readiness-audit',
  'diagnostics-readout-chain-already-packaged-no-more-pack-wiring-selected',
]) {
  assert.match(selectionSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step337Smoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(step337Smoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.GET_STATE/);
assert.match(step352Smoke, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(step352Smoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.doesNotMatch(step352Smoke, /UPDATE_SNAPSHOT/);
assert.match(step354Smoke, /members: 'replay-coordination,readout-producer-flow'/);
assert.match(step354Smoke, /selectedCount, 8/);
assert.match(packHelper, /readout-producer-flow/);
assert.match(packHelper, /replay-coordination/);

assert.match(paneStatus, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(paneStatus, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS\.SNAPSHOT_READY/);
assert.doesNotMatch(paneStatus, /UPDATE_SNAPSHOT|\/v4\/target_bars|fetchV4TargetBars/);

for (const producerSource of [displayRuntime, manualNextRuntime, autoPlayRuntime]) {
  assert.doesNotMatch(
    producerSource,
    /target-materialization-diagnostics-readout-chain-selection|TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS|targetMaterializationReplayDiagnostics\.updateSnapshot/,
  );
}

assert.doesNotMatch(
  replayRuntime,
  /target-materialization-diagnostics-readout-chain-selection|LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|fetchV4TargetBars/,
);

console.log('v6 target materialization diagnostics readout chain boundary step355 static smoke passed');
