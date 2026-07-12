import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-browser-step370-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');
const skeleton = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const step369 = await readFile(
  'v6/docs/V6_HTF_LEFTWARD_EXTENSION_REAL_CHART_PAINT_VISIBILITY_STEP369.md',
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
  'Input.dispatchMouseEvent',
  "type: 'mouseWheel'",
  'user-input-dispatched',
  'inputToTargetFetchStartMs',
  'inputToLeftExtensionLoadedMs',
  'targetRequestMs',
  'sourceRequestMs',
  'chartDataReplacementMs',
  'viewportReapplyMs',
  'realChartPaintVisibleLagMs',
  'canvasSignature',
  'htf-drag-triggered-leftward-extension-interaction-measurement',
]) {
  assert.match(browserSmoke, new RegExp(field.replaceAll('.', '\\.')));
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
assert.match(browserSmoke, /sourceRequestCount, 0/);
assert.match(browserSmoke, /targetRequestCount >= 1/);
assert.doesNotMatch(browserSmoke, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(app, /registry\.registerRuntime\(createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)\)/);
assert.match(skeleton, /const RUNTIME_ID = 'runtime\.replay-coordination-materialization-handoff'/);
assert.match(step369, /Step 370 should measure the real drag-triggered HTF leftward-extension\s+interaction path/);

console.log('v6 high timeframe drag-triggered leftward extension interaction boundary step370 static smoke passed');
