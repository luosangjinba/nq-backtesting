import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/high-timeframe-leftward-extension-performance-after-handoff-browser-step367-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');
const packHelper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const skeleton = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
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
  'sourceRequestMs',
  'targetRequestMs',
  'chartDataReplacementMs',
  'viewportReapplyMs',
  'visibleApplyLagMs',
  'browserPaintLagMs',
  'visualLatencyMs',
  'runtimeDurationMs',
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
  'htf-leftward-extension-performance-after-handoff',
]) {
  assert.match(browserSmoke, new RegExp(boundary.replaceAll('.', '\\.')));
}

assert.match(app, /createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(app, /registry\.registerRuntime\(createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)\)/);
assert.match(packHelper, /handoff-registration/);
assert.doesNotMatch(
  browserSmoke,
  /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/,
);
assert.match(skeleton, /const RUNTIME_ID = 'runtime\.replay-coordination-materialization-handoff'/);
assert.match(skeleton, /id: RUNTIME_ID/);

console.log('v6 high timeframe leftward extension performance after handoff step367 static smoke passed');
