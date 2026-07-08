import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
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
import { resetSessionIdsForTest } from '../src/session/session-domain.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createPlaybackPeriodRuntime } from '../src/playback-period/playback-period-runtime.js';
import { createChartEntryRuntime } from '../src/chart-entry/chart-entry-runtime.js';
import { createChartEntryInitializationRuntime } from '../src/chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryContextRuntime } from '../src/chart-entry/chart-entry-context-runtime.js';
import { createChartEntryReplayBootstrapRuntime } from '../src/chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { createChartEntryDefaultWallPlanRuntime } from '../src/chart-entry/chart-entry-default-wall-plan-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from '../src/chart-entry/chart-entry-projection-preparation-runtime.js';
import { createChartEntryProjectionApplyRuntime } from '../src/chart-entry/chart-entry-projection-apply-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';

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

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const step145Doc = await readFile('v6/docs/V6_REPLAY_KLINE_CHART_FLOW_STEP145.md', 'utf8');
const todoDoc = await readFile('v6/TODO.md', 'utf8');

assert.match(step145Doc, /browser-visible K-line checks/);
assert.match(step145Doc, /prefix plus start bar/);
assert.match(step145Doc, /Step 146 should focus on reset view \/ KXG reset behavior/);
assert.match(todoDoc, /Step 146 - Reset View \/ KXG Reset Flow/);

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
let clock = 1000;
const fetchBars = createDatabaseBarsAdapter({
  now: () => {
    clock += 3;
    return clock;
  },
  queryBars: async ({ schema, window }) => {
    queryCalls.push({ schema, window });
    const rows = databaseRows.get(`${window.start}|${window.end}`) || [];
    return { rows };
  },
});

const registry = createRuntimeRegistry();
const appliedEvents = [];
const unsubscribeApplied = subscribeEvent(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED, (payload) => {
  appliedEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 20 }));
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

const session = await dispatchCommand(SESSION_COMMANDS.CREATE, {
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
assert.equal(applied.applied.sessionId, session.id);
assert.equal(appliedEvents.length, 1);

const initialChart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(initialChart.bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
]);
assert.equal(initialChart.bars.at(-1).close, 100.5);
assert.equal(JSON.stringify(queryCalls.map((call) => call.window)).includes('2026-06-01 09:35'), false);
assert.equal(queryCalls.length, 1);
assert.deepEqual(queryCalls[0].window, {
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:30',
  estimatedBars: 4,
  instrument: 'NQ',
  start: '2026-06-01 09:27',
  timeframe: 1,
});

const viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
assert.equal(viewport.intent.cursorTimestamp, 1780306200);
assert.equal(viewport.intent.origin, 'default');
assert.deepEqual(viewport.projection, {
  from: -29,
  latestLogicalIndex: 3,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 40,
  to: 11,
});

await dispatchCommand(PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, { period: '1m' });
const next = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
assert.equal(next.status, 'advanced');
assert.equal(next.error, null);
assert.equal(next.advanced.appendedBarCount, 1);
assert.equal(next.advanced.loadedWindow.barCount, 2);
assert.equal(queryCalls.length, 2);
assert.deepEqual(queryCalls[1].window, {
  anchor: '2026-06-01T09:31:00.000Z',
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:31',
  estimatedBars: 2,
  instrument: 'NQ',
  start: '2026-06-01 09:30',
  timeframe: 1,
});

const afterNextChart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(afterNextChart.bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
]);
assert.equal((await dispatchCommand(REPLAY_COMMANDS.GET_STATE)).cursorTime, '2026-06-01T09:31:00.000Z');

const cacheSummary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(cacheSummary.windowCount, 2);
assert.equal(cacheSummary.barCount, 6);

await registry.stop();
unsubscribeApplied();

console.log('v6 replay k-line chart flow step 145 smoke passed');
