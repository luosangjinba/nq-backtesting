import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const selector = await readFile(
  'v6/tests/governance/helpers/chart-history/high-timeframe-leftward-extension-bottleneck-owner-selection.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-step368-smoke.js',
  'utf8',
);
const runtimeManifest = await readFile('v6/src/runtime/replay-pipeline-runtime-contributions.js', 'utf8');
const skeleton = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);

for (const boundary of [
  'runtime.bar-data-target-window',
  'runtime.chart-data',
  'runtime.chart-viewport',
  'chart-surface-browser-paint-measurement',
  'target-history-diagnostics-readout-or-browser-visibility',
  'target-history-real-chart-paint-visibility-measurement',
]) {
  assert.match(selector, new RegExp(boundary.replaceAll('.', '\\.')));
}

for (const phase of [
  'sourceRequestMs',
  'targetRequestMs',
  'chartDataReplacementMs',
  'viewportReapplyMs',
  'visibleApplyLagMs',
  'browserPaintLagMs',
]) {
  assert.match(selector, new RegExp(phase));
  assert.match(smoke, new RegExp(phase));
}

assert.match(smoke, /observedStep367/);
assert.match(smoke, /browser-paint-observation-window-dominates-with-low-runtime-costs/);
assert.match(smoke, /rejectedOwnerCandidates/);
assert.match(smoke, /within-budget/);

assert.doesNotMatch(selector, /registerCommand|dispatchCommand|subscribeEvent|fetch\(|\/v4\/target_bars|UPDATE_SNAPSHOT/);
assert.doesNotMatch(selector, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(runtimeManifest, /createReplayCoordinationMaterializationRuntimeHandoff\(\{ dispatchCommand, subscribeEvent \}\)/);
assert.match(skeleton, /const RUNTIME_ID = 'runtime\.replay-coordination-materialization-handoff'/);
assert.match(skeleton, /id: RUNTIME_ID/);

console.log('v6 high timeframe leftward extension bottleneck owner selection boundary step368 static smoke passed');
