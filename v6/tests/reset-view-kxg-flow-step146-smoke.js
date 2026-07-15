import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createDatabaseBarsAdapter } from '../src/bar-data/database-bars-adapter.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createChartEntryRuntime } from '../src/chart-entry/chart-entry-runtime.js';
import { createChartEntryContextRuntime } from '../src/chart-entry/chart-entry-context-runtime.js';
import { createChartEntryDefaultWallPlanRuntime } from '../src/chart-entry/chart-entry-default-wall-plan-runtime.js';
import { createChartEntryInitializationRuntime } from '../src/chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createChartEntryProjectionApplyRuntime } from '../src/chart-entry/chart-entry-projection-apply-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from '../src/chart-entry/chart-entry-projection-preparation-runtime.js';
import { createChartEntryReplayBootstrapRuntime } from '../src/chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { createPlaybackPeriodRuntime } from '../src/playback-period/playback-period-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import { resetSessionIdsForTest } from '../src/session/session-domain.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';

async function waitForCommandState(command, predicate, label) {
  const deadline = Date.now() + 1000;
  let state = await dispatchCommand(command);
  while (!predicate(state) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    state = await dispatchCommand(command);
  }
  assert.equal(predicate(state), true, `${label}: ${JSON.stringify(state)}`);
  return state;
}

function latestLogicalIndex(record = {}) {
  return Math.max(0, (record.bars?.length || 0) - 1);
}

function replayCursorTimestamp(replayState = {}) {
  return Math.floor(new Date(replayState.cursorTime).valueOf() / 1000);
}

async function snapshotBoundaryState() {
  return {
    cache: await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY),
    chart: await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' }),
    replay: await dispatchCommand(REPLAY_COMMANDS.GET_STATE),
    viewport: await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' }),
  };
}

async function assertResetKeepsRuntimeBoundaries({
  chartDataEventCount,
  expectedLatestOffsetBars,
  label,
  queryCallCount,
}) {
  const before = await snapshotBoundaryState();
  const beforeBars = before.chart.bars.map((bar) => ({ ...bar }));
  const latestIndex = latestLogicalIndex(before.chart);

  const manualIntent = await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
    latestOffsetBars: expectedLatestOffsetBars + 17,
    paneId: 'main',
    spanBars: 18,
  });
  assert.equal(manualIntent.intent.origin, 'manual', `${label} manual intent origin`);
  const manualProjection = await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
    chartBarsRevision: before.chart.revision,
    latestLogicalIndex: latestIndex,
    paneId: 'main',
  });
  assert.equal(manualProjection.projection.origin, 'manual', `${label} manual projection origin`);
  assert.equal(
    manualProjection.projection.latestOffsetBars,
    expectedLatestOffsetBars + 17,
    `${label} manual latest offset`
  );

  const resetProjection = await dispatchCommand(CHART_VIEWPORT_COMMANDS.RESET_VIEW, {
    chartBarsRevision: before.chart.revision,
    latestLogicalIndex: latestIndex,
    paneId: 'main',
  });
  const after = await snapshotBoundaryState();

  assert.equal(resetProjection.intent.origin, 'default', `${label} reset intent origin`);
  assert.equal(resetProjection.intent.latestOffsetBars, expectedLatestOffsetBars, `${label} reset latest offset`);
  assert.equal(resetProjection.intent.spanBars, null, `${label} reset keeps default span intent`);
  assert.equal(resetProjection.projection.origin, 'default', `${label} reset projection origin`);
  assert.equal(resetProjection.projection.latestLogicalIndex, latestIndex, `${label} reset latest logical index`);
  assert.equal(resetProjection.projection.to - latestIndex, expectedLatestOffsetBars, `${label} reset right wall`);
  assert.equal(resetProjection.projection.spanBars, 120, `${label} reset projection default span`);
  assert.deepEqual(after.chart.bars, beforeBars, `${label} reset must not mutate chart bars`);
  assert.equal(after.chart.revision, before.chart.revision, `${label} reset must not revise chart data`);
  assert.deepEqual(after.replay, before.replay, `${label} reset must not mutate replay state`);
  assert.deepEqual(after.cache, before.cache, `${label} reset must not mutate bar cache`);
  assert.equal(queryCalls.length, queryCallCount, `${label} reset must not request bars`);
  assert.equal(chartDataEvents.length, chartDataEventCount, `${label} reset must not write chart series`);
  assert.equal(after.viewport.intent.cursorTimestamp, replayCursorTimestamp(before.replay), `${label} cursor timestamp`);
}

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const databaseRows = new Map([
  ['2026-06-01 09:27|2026-06-01 09:30', [
    { ts: '2026-06-01 09:27', open: 97, high: 98, low: 96, close: 97.5, volume: 7 },
    { ts: '2026-06-01 09:28', open: 98, high: 99, low: 97, close: 98.5, volume: 8 },
    { ts: '2026-06-01 09:29', open: 99, high: 100, low: 98, close: 99.5, volume: 9 },
    { ts: '2026-06-01 09:30', open: 100, high: 101, low: 99, close: 100.5, volume: 10 },
  ]],
  ['2026-06-01 09:30|2026-06-01 09:31', [
    { ts: '2026-06-01 09:30', open: 100, high: 101, low: 99, close: 100.5, volume: 10 },
    { ts: '2026-06-01 09:31', open: 101, high: 102, low: 100, close: 101.5, volume: 11 },
  ]],
]);
const queryCalls = [];
const chartDataEvents = [];
let clock = 1000;
const fetchBars = createDatabaseBarsAdapter({
  now: () => {
    clock += 3;
    return clock;
  },
  queryBars: async ({ schema, window }) => {
    queryCalls.push({ schema, window });
    const rows = databaseRows.get(`${window.start}|${window.end}`)
      || (window.start === '2026-06-01 09:31' ? databaseRows.get('2026-06-01 09:30|2026-06-01 09:31') : [])
      || [];
    return { rows };
  },
});

const registry = createRuntimeRegistry();
const appliedEvents = [];
const unsubscribeApplied = subscribeEvent(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED, (payload) => {
  appliedEvents.push(payload);
});
const unsubscribeChartData = subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload) => {
  chartDataEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 300 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createPlaybackPeriodRuntime());
registry.registerRuntime(createChartEntryRuntime());
registry.registerRuntime(createChartEntryInitializationRuntime({ prefixBars: 3 }));
registry.registerRuntime(createChartEntryContextRuntime());
registry.registerRuntime(createChartEntryReplayBootstrapRuntime());
registry.registerRuntime(createChartEntryDefaultWallPlanRuntime({
  latestOffsetBars: 8,
  prefixBars: 3,
  spanBars: 40,
}));
registry.registerRuntime(createChartEntryProjectionPreparationRuntime());
registry.registerRuntime(createChartEntryProjectionApplyRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-01T09:35:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
});

const applied = await waitForCommandState(
  CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE,
  (state) => state.status === 'applied' || state.status === 'error',
  'projection apply should finish',
);
assert.equal(applied.status, 'applied');
assert.equal(applied.error, null);
assert.equal(appliedEvents.length, 1);
assert.equal(queryCalls.length, 1);
assert.equal(chartDataEvents.length, 1);

await assertResetKeepsRuntimeBoundaries({
  chartDataEventCount: 1,
  expectedLatestOffsetBars: 8,
  label: 'initial replay k-line reset',
  queryCallCount: 1,
});

await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, { period: '1m' });
const next = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
assert.equal(next.status, 'advanced');
assert.equal(next.error, null);
assert.equal(queryCalls.length, 2);
assert.equal(chartDataEvents.length, 2);

const afterNext = await snapshotBoundaryState();
assert.equal(afterNext.chart.bars.length, 5);
assert.equal(afterNext.replay.cursorTime, '2026-06-01T09:31:00.000Z');
assert.equal(afterNext.viewport.intent.cursorTimestamp, replayCursorTimestamp(afterNext.replay));

await assertResetKeepsRuntimeBoundaries({
  chartDataEventCount: 2,
  expectedLatestOffsetBars: 8,
  label: 'after next replay k-line reset',
  queryCallCount: 2,
});

await registry.stop();
unsubscribeApplied();
unsubscribeChartData();

console.log('v6 reset view KXG flow step 146 smoke passed');
