import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

async function assertFileExists(path) {
  await access(path);
}

function assertBefore(source, left, right, message) {
  const leftIndex = source.indexOf(left);
  const rightIndex = source.indexOf(right);
  assert.notEqual(leftIndex, -1, `${left} is missing`);
  assert.notEqual(rightIndex, -1, `${right} is missing`);
  assert.equal(leftIndex < rightIndex, true, message || `${left} must appear before ${right}`);
}

function assertIncludesAll(source, tokens, label) {
  for (const token of tokens) {
    assert.equal(source.includes(token), true, `${label} must include ${token}`);
  }
}

function assertExcludesAll(source, tokens, label) {
  for (const token of tokens) {
    assert.equal(source.includes(token), false, `${label} must not include ${token}`);
  }
}

const [
  appSource,
  architectureDoc,
  handoffDoc,
  indexDoc,
  todoDoc,
  appShellSource,
  chartEntryManualNextSource,
  chartEntryAutoPlaySource,
  chartDataRuntimeSource,
  chartViewportRuntimeSource,
  chartHistoryRuntimeSource,
  chartSurfaceSource,
  chartHostManagerSource,
  lightweightAdapterSource,
  chartDataBridgeSource,
  chartViewportBridgeSource,
  manualWallBridgeSource,
  leftwardHistoryBridgeSource,
] = await Promise.all([
  read('v6/src/app.js'),
  read('v6/docs/V6_ARCHITECTURE.md'),
  read('v6/docs/V6_HANDOFF.md'),
  read('v6/docs/INDEX.md'),
  read('v6/TODO.md'),
  read('v6/src/shell/app-shell.js'),
  read('v6/src/chart-entry/chart-entry-manual-next-runtime.js'),
  read('v6/src/chart-entry/chart-entry-auto-play-runtime.js'),
  read('v6/src/chart-data/chart-data-runtime.js'),
  read('v6/src/chart-viewport/chart-viewport-runtime.js'),
  read('v6/src/chart-history/leftward-history-extension-runtime.js'),
  read('v6/src/chart-engine/workstation-chart-surface.js'),
  read('v6/src/chart-engine/chart-host-manager.js'),
  read('v6/src/chart-engine/lightweight-chart-adapter.js'),
  read('v6/src/chart-engine/chart-data-surface-bridge.js'),
  read('v6/src/chart-engine/chart-viewport-surface-bridge.js'),
  read('v6/src/chart-engine/manual-wall-input-bridge.js'),
  read('v6/src/chart-history/leftward-history-input-bridge.js'),
]);

await Promise.all([
  assertFileExists('v6/tests/layout-variant-geometry-browser-step164-smoke.js'),
  assertFileExists('v6/tests/database-kline-import-boundary-step144-smoke.js'),
  assertFileExists('v6/tests/replay-kline-chart-flow-step145-smoke.js'),
  assertFileExists('v6/tests/replay-kline-chart-flow-browser-step145-smoke.js'),
  assertFileExists('v6/tests/reset-view-kxg-flow-step146-smoke.js'),
  assertFileExists('v6/tests/reset-view-kxg-flow-browser-step146-smoke.js'),
  assertFileExists('v6/tests/multi-pane-chart-foundation-step147-smoke.js'),
  assertFileExists('v6/tests/leftward-history-extension-step148-smoke.js'),
  assertFileExists('v6/tests/drag-triggered-history-extension-browser-step149-smoke.js'),
  assertFileExists('v6/tests/replay-speed-history-inflight-step150-smoke.js'),
  assertFileExists('v6/tests/continuous-leftward-history-step151-smoke.js'),
  assertFileExists('v6/tests/auto-play-continuous-history-step152-smoke.js'),
  assertFileExists('v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js'),
  assertFileExists('v6/tests/multi-pane-crosshair-readout-step154-smoke.js'),
  assertFileExists('v6/tests/multi-pane-leftward-history-step155-smoke.js'),
  assertFileExists('v6/tests/multi-pane-replay-append-step156-smoke.js'),
  assertFileExists('v6/tests/multi-pane-replay-append-browser-step156-smoke.js'),
  assertFileExists('v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js'),
  assertFileExists('v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js'),
  assertFileExists('v6/tests/multi-pane-replay-viewport-history-step157-smoke.js'),
]);

assertIncludesAll(appSource, [
  'registry.registerRuntime(createBarDataRuntime())',
  'registry.registerRuntime(createChartDataRuntime())',
  'registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }))',
  'registry.registerRuntime(createChartViewportRuntime())',
  'registry.registerRuntime(createChartEntryManualNextRuntime())',
  'registry.registerRuntime(createChartEntryAutoPlayRuntime())',
  'registry.registerRuntime(createLeftwardHistoryExtensionRuntime())',
  'registry.registerRuntime(createPlaybackPeriodRuntime())',
  'connectChartDataSurfaceBridge',
  'connectChartViewportSurfaceBridge',
  'connectManualWallInputBridge',
  'connectLeftwardHistoryInputBridge',
  'connectResetViewControl',
  'mountStatusReadout',
], 'app integration');
assertBefore(appSource, 'registry.registerRuntime(createChartViewportRuntime())', 'registry.registerRuntime(createChartEntryProjectionApplyRuntime())');
assertBefore(appSource, 'await registry.start({ root, emitEvent, subscribeEvent });', 'mountWorkstationChartSurface(root, { emitEvent })');
assertBefore(appSource, 'const workstationChartSurface = mountWorkstationChartSurface(root, { emitEvent });', 'const chartDataSurfaceBridge = connectChartDataSurfaceBridge');
assertBefore(appSource, 'const chartDataSurfaceBridge = connectChartDataSurfaceBridge', 'const chartViewportSurfaceBridge = connectChartViewportSurfaceBridge');

assertIncludesAll(architectureDoc, [
  'Chart Engine Adapter',
  'setData` / `update` / visible logical range API calls',
  'Bar Data Runtime',
  'cache keys',
  'Replay Runtime',
  'replay cursor',
  'Chart Viewport Runtime',
  'V6 must model user/chart viewport intent as a',
], 'architecture doc');
assertIncludesAll(todoDoc, [
  'Latest completed step: Step 164 - Layout Variant Geometry Boundary',
  'Step 165 - Pane Resize Drag Boundary',
  'preserve Step 164 layout variant geometry',
  'do not request/cache bars outside bar-data',
  'do not write chart series outside chart-engine',
  'do not mutate replay cursor outside replay runtime',
  'do not mutate viewport intent outside chart-viewport runtime',
], 'todo');
assertIncludesAll(indexDoc, [
  'V6_LAYOUT_VARIANT_GEOMETRY_STEP164.md',
  'V6_PANE_LOCAL_RESET_VIEW_CONTROLS_STEP163.md',
  'V6_LAYOUT_PANE_DATA_BOOTSTRAP_STEP162.md',
  'V6_LAYOUT_PANE_SURFACE_REFLOW_STEP161.md',
  'V6_LAYOUT_MENU_OWNER_BINDING_STEP160.md',
  'V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP159.md',
  'V6_CHART_FOUNDATION_INTEGRATION_REAUDIT_STEP158.md',
  'V6_MULTI_PANE_REPLAY_VIEWPORT_PROJECTION_STEP157.md',
  'V6_MULTI_PANE_REPLAY_APPEND_STEP156.md',
  'V6_MULTI_PANE_LEFTWARD_HISTORY_STEP155.md',
], 'index');
assertIncludesAll(handoffDoc, [
  'Current V6 step state: Step 164 completed.',
  'Next planned step: Step 165 - Pane Resize Drag Boundary.',
  'Browser tests should be run sequentially',
], 'handoff');

assertExcludesAll(appShellSource, [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'createChart(',
  'setData(',
  'setVisibleLogicalRange(',
], 'app shell');

assertIncludesAll(chartEntryManualNextSource, [
  'REPLAY_COMMANDS.NEXT',
  'BAR_DATA_COMMANDS.LOAD_WINDOW',
  'CHART_DATA_COMMANDS.APPEND_BARS',
  'paneId',
], 'manual next runtime');
assertExcludesAll(chartEntryManualNextSource, [
  'CHART_VIEWPORT_COMMANDS',
  'setVisibleLogicalRange',
  'createChart(',
], 'manual next runtime');

assertIncludesAll(chartEntryAutoPlaySource, [
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'paneId: state.paneId',
], 'auto-play runtime');
assertExcludesAll(chartEntryAutoPlaySource, [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS.APPEND_BARS',
  'CHART_VIEWPORT_COMMANDS',
  'setVisibleLogicalRange',
], 'auto-play runtime');

assertIncludesAll(chartDataRuntimeSource, [
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'CHART_DATA_COMMANDS.APPEND_BARS',
  'CHART_DATA_COMMANDS.PREPEND_BARS',
  'CHART_DATA_EVENTS.BARS_CHANGED',
], 'chart-data runtime');
assertExcludesAll(chartDataRuntimeSource, [
  'BAR_DATA_COMMANDS',
  'REPLAY_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'createChart(',
  'setVisibleLogicalRange',
], 'chart-data runtime');

assertIncludesAll(chartViewportRuntimeSource, [
  'CHART_VIEWPORT_COMMANDS.ENSURE_INTENT',
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
  'CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION',
  'CHART_DATA_EVENTS.BARS_CHANGED',
  'CHART_VIEWPORT_EVENTS.PROJECTED',
], 'chart-viewport runtime');
assertExcludesAll(chartViewportRuntimeSource, [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS.APPEND_BARS',
  'createChart(',
  'series.setData',
], 'chart-viewport runtime');

assertIncludesAll(chartHistoryRuntimeSource, [
  'BAR_DATA_COMMANDS.LOAD_WINDOW',
  'CHART_DATA_COMMANDS.PREPEND_BARS',
  'CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION',
  'paneId',
], 'chart-history runtime');
assertExcludesAll(chartHistoryRuntimeSource, [
  'setVisibleLogicalRange',
  'createChart(',
  'series.setData',
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
], 'chart-history runtime');

assertIncludesAll(chartDataBridgeSource, [
  'CHART_DATA_EVENTS.BARS_CHANGED',
  'chartSurface.applyChartDataRecord',
], 'chart data bridge');
assertIncludesAll(chartViewportBridgeSource, [
  'CHART_VIEWPORT_EVENTS.PROJECTED',
  'chartSurface.applyViewportProjection',
], 'chart viewport bridge');
assertIncludesAll(manualWallBridgeSource, [
  'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT',
  'CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION',
], 'manual wall bridge');
assertIncludesAll(leftwardHistoryBridgeSource, [
  'CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION',
  'visibleRange',
], 'leftward history bridge');

assertIncludesAll(chartSurfaceSource, [
  'applyChartDataRecord',
  'applyViewportProjection',
  'manager.setData',
  'manager.setVisibleLogicalRange',
  'subscribeVisibleRangeChange',
  'subscribeCrosshairMove',
], 'chart surface');
assertIncludesAll(chartHostManagerSource, [
  'record.adapter.setData(bars)',
  'record.adapter.setVisibleLogicalRange(range)',
], 'chart host manager');
assertIncludesAll(lightweightAdapterSource, [
  'createChart(host, chartOptions)',
  'series.setData(data)',
  'chart.timeScale().setVisibleLogicalRange(normalizedRange)',
  'timeScale.subscribeVisibleLogicalRangeChange(listener)',
  'chart.subscribeCrosshairMove',
], 'lightweight adapter');

console.log('v6 chart foundation integration reaudit step 158 smoke passed');
