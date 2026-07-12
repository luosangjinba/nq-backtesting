import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browserSmoke = await readFile(
  'v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js',
  'utf8',
);
const app = await readFile('v6/src/app.js', 'utf8');
const skeleton = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const step370 = await readFile(
  'v6/docs/V6_HTF_DRAG_TRIGGERED_LEFTWARD_EXTENSION_INTERACTION_STEP370.md',
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
  'target-fetch-ended',
  'chart-data-applied',
  'viewport-projected',
  'left-extension-loaded',
  'diagnostics-readout-visible',
  'fetchEndToChartDataMs',
  'chartDataToViewportMs',
  'viewportToLeftExtensionMs',
  'leftExtensionToReadoutMs',
  'viewportProjectionObserved',
  'postMarkerCanvasObservationMs',
  'htf-drag-triggered-low-overhead-runtime-milestone-attribution',
]) {
  assert.match(browserSmoke, new RegExp(field.replaceAll('.', '\\.')));
}

assert.match(browserSmoke, /function mark\(name, details = \{\}\)/);
assert.doesNotMatch(browserSmoke, /signatureChangedFromBaseline|activeBaselineSignature|mark\([^)]*canvasSignature/);
assert.match(browserSmoke, /const postMarkerCanvasStartedAt = performance\.now\(\)/);
assert.match(browserSmoke, /const postMarkerCanvasSignature = canvasSignature\(\)/);
assert.match(browserSmoke, /getImageData/);
assert.match(browserSmoke, /sourceRequestCount, 0/);
assert.match(browserSmoke, /targetRequestCount >= 1/);

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

assert.doesNotMatch(browserSmoke, /registerCommand|registerRuntime|UPDATE_SNAPSHOT|createReplayCoordinationMaterializationRuntimeHandoff/);
assert.match(app, /registry\.registerRuntime\(createReplayCoordinationMaterializationRuntimeHandoff\(\{ subscribeEvent, dispatchCommand \}\)\)/);
assert.match(skeleton, /const RUNTIME_ID = 'runtime\.replay-coordination-materialization-handoff'/);
assert.match(step370, /Step 371 should implement low-overhead drag-triggered runtime milestone\s+attribution/);

console.log('v6 high timeframe drag-triggered low-overhead runtime milestones boundary step371 static smoke passed');
