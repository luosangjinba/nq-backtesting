import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-browser-step369-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');
const skeleton = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const selectorDoc = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_BOTTLENECK_OWNER_SELECTION_STEP368.md',
  'utf8',
);

for (const pattern of [
  /label: '4h'[\s\S]*targetTimeframe: 240/,
  /label: '8h'[\s\S]*targetTimeframe: 480/,
  /label: '1D'[\s\S]*targetTimeframe: '1D'/,
  /label: '1W'[\s\S]*targetTimeframe: '1W'/,
  /expectedTargetFetchTf: '4h'/,
  /expectedTargetFetchTf: '8h'/,
  /expectedTargetFetchTf: '1D'/,
  /expectedTargetFetchTf: '1W'/,
]) {
  assert.match(browserSmoke, pattern);
}

for (const field of [
  'canvasSignature',
  'signatureChangedFromBaseline',
  'realChartPaintVisibleLagMs',
  'seriesUpdateToFirstPaintMs',
  'harnessObservationWindowMs',
  'harnessMinusRealPaintMs',
  'target-history-real-chart-paint-visibility-measurement',
]) {
  assert.match(browserSmoke, new RegExp(field));
}

for (const boundary of [
  'DISPLAY_TIMEFRAME_COMMANDS.APPLY',
  'CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED',
  'applyChartDataRecord',
  'applyViewportProjection',
  'runtime.leftward-history-extension',
  'runtime.replay-coordination-materialization-handoff',
]) {
  assert.match(browserSmoke, new RegExp(boundary.replaceAll('.', '\\.')));
}

assert.match(browserSmoke, /getImageData/);
assert.match(browserSmoke, /requestAnimationFrame/);
assert.match(browserSmoke, /sourceRequestCount, 0/);
assert.match(browserSmoke, /targetRequestCount, 1/);
assert.doesNotMatch(browserSmoke, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(app, /registry\.registerRuntime\(createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)\)/);
assert.match(skeleton, /const RUNTIME_ID = 'runtime\.replay-coordination-materialization-handoff'/);
assert.match(selectorDoc, /target-history-real-chart-paint-visibility-measurement/);

console.log('v6 high timeframe leftward extension real chart paint visibility boundary step369 static smoke passed');
