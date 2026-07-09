import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  PANE_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_COMMANDS,
  PANE_INTENT_RELOAD_DATA_COMMANDS,
  PANE_INTENT_RELOAD_PLAN_COMMANDS,
  PANE_INTENT_RELOAD_VIEWPORT_COMMANDS,
  PANE_INTENT_RELOAD_VIEWPORT_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createPaneIntentReloadChartDataRuntime } from '../src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js';
import { createPaneIntentReloadDataRuntime } from '../src/pane-intent-reload/pane-intent-reload-data-runtime.js';
import { createPaneIntentReloadRuntime } from '../src/pane-intent-reload/pane-intent-reload-runtime.js';
import { createPaneIntentReloadViewportRuntime } from '../src/pane-intent-reload/pane-intent-reload-viewport-runtime.js';
import { createPaneIntentReloadWindowRuntime } from '../src/pane-intent-reload/pane-intent-reload-window-runtime.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneStore } from '../src/panes/pane-store.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

function minuteTimestamp(hour, minute) {
  return Math.floor(Date.UTC(2026, 5, 1, hour, minute, 0, 0) / 1000);
}

function barsForWindow(window = {}) {
  return [
    { close: 101, high: 102, low: 99, open: 100, timestamp: minuteTimestamp(9, 22) },
    { close: 102, high: 103, low: 100, open: 101, timestamp: minuteTimestamp(9, 23) },
    { close: 103, high: 104, low: 101, open: 102, timestamp: minuteTimestamp(9, 24) },
    { close: 104, high: 105, low: 102, open: 103, timestamp: minuteTimestamp(9, 25) },
    { close: 105, high: 106, low: 103, open: 104, timestamp: minuteTimestamp(9, 26) },
    { close: 106, high: 107, low: 104, open: 105, timestamp: minuteTimestamp(9, 27) },
    { close: 107, high: 108, low: 105, open: 106, timestamp: minuteTimestamp(9, 28) },
    { close: 108, high: 109, low: 106, open: 107, timestamp: minuteTimestamp(9, 29) },
    { close: 109, high: 110, low: 107, open: 108, timestamp: minuteTimestamp(9, 30) },
    { close: 110, high: 111, low: 108, open: 109, timestamp: minuteTimestamp(9, 31) },
    { close: 111, high: 112, low: 109, open: 110, timestamp: minuteTimestamp(9, 32) },
  ];
}

async function waitForProjectedCount(count) {
  const deadline = Date.now() + 1000;
  let state = await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE);
  while (state.projectedCount < count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    state = await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE);
  }
  return state;
}

clearCommandsForTest();
clearEventsForTest();

const requests = [];
const projectedEvents = [];
const paneStore = createPaneStore({
  initialPanes: [
    createPaneRecord({ active: true, displayTimeframe: 1, id: 'main', instrument: 'NQ' }),
    createPaneRecord({ active: false, displayTimeframe: 5, id: 'secondary', instrument: 'ES' }),
  ],
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push({ ...window });
    return {
      bars: barsForWindow(window),
      requestedRange: {
        endTs: minuteTimestamp(9, 32),
        startTs: Number(window.timeframe) === 5 ? minuteTimestamp(9, 22) : minuteTimestamp(9, 30),
      },
      timing: { durationMs: 3, parseMs: 1, requestMs: 2, source: 'step179-fetch' },
    };
  },
  maxBarsPerWindow: 2500,
}));
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createPaneIntentReloadRuntime());
registry.registerRuntime(createPaneIntentReloadWindowRuntime());
registry.registerRuntime(createPaneIntentReloadDataRuntime());
registry.registerRuntime(createPaneIntentReloadChartDataRuntime());
registry.registerRuntime(createPaneIntentReloadViewportRuntime());

const unsubscribeProjected = subscribeEvent(PANE_INTENT_RELOAD_VIEWPORT_EVENTS.PROJECTED, (records) => {
  projectedEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE), true);

await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
  endTime: '2026-06-01T09:34:00.000Z',
  id: 'step179-session',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1',
});
await dispatchCommand(REPLAY_COMMANDS.NEXT);
await dispatchCommand(REPLAY_COMMANDS.NEXT);

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [{ close: 500, high: 501, low: 499, open: 500, timestamp: minuteTimestamp(9, 30) }],
  cursorTimestamp: minuteTimestamp(9, 30),
  paneId: 'main',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [{ close: 600, high: 601, low: 599, open: 600, timestamp: minuteTimestamp(9, 30) }],
  cursorTimestamp: minuteTimestamp(9, 30),
  paneId: 'secondary',
});

await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
  instrument: 'YM',
  paneId: 'main',
});
let viewportState = await waitForProjectedCount(1);
assert.equal(viewportState.status, 'projected');
assert.equal(projectedEvents.length, 1);
assert.equal(projectedEvents[0][0].paneId, 'main');
assert.equal(projectedEvents[0][0].cursorTimestamp, minuteTimestamp(9, 32));

assert.equal(requests.length, 1);
assert.equal(requests[0].instrument, 'YM');
assert.equal(requests[0].timeframe, 1);
assert.equal(requests[0].end, '2026-06-01 09:32');
assert.equal(requests[0].requestCap, 'replay-cursor');

const mainAfterSymbol = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
const secondaryAfterSymbol = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
assert.deepEqual(mainAfterSymbol.bars.map((bar) => bar.timestamp), [
  minuteTimestamp(9, 22),
  minuteTimestamp(9, 23),
  minuteTimestamp(9, 24),
  minuteTimestamp(9, 25),
  minuteTimestamp(9, 26),
  minuteTimestamp(9, 27),
  minuteTimestamp(9, 28),
  minuteTimestamp(9, 29),
  minuteTimestamp(9, 30),
  minuteTimestamp(9, 31),
  minuteTimestamp(9, 32),
]);
assert.deepEqual(secondaryAfterSymbol.bars.map((bar) => bar.close), [600]);
assert.equal((await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' })).chartBarsRevision, mainAfterSymbol.revision);
assert.equal(await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' }), null);

await dispatchCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, {
  displayTimeframe: 5,
  paneId: 'secondary',
});
viewportState = await waitForProjectedCount(2);
assert.equal(viewportState.status, 'projected');
const intervalDiagnostic = {
  chartDataState: await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE),
  dataState: await dispatchCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE),
  planState: await dispatchCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE),
  projectedEvents,
  requests,
  viewportState,
};
assert.equal(projectedEvents.length, 2, JSON.stringify(intervalDiagnostic));
assert.equal(projectedEvents[1][0].paneId, 'secondary');
assert.equal(projectedEvents[1][0].cursorTimestamp, minuteTimestamp(9, 32));

assert.equal(requests.length, 2);
assert.equal(requests[1].instrument, 'ES');
assert.equal(requests[1].timeframe, 1);
assert.equal(requests[1].end, '2026-06-01 09:32');
assert.equal(requests[1].requestCap, 'replay-cursor');

const mainAfterInterval = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
const secondaryAfterInterval = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
assert.deepEqual(mainAfterInterval, mainAfterSymbol);
assert.deepEqual(secondaryAfterInterval.bars.map((bar) => bar.timestamp), [
  minuteTimestamp(9, 20),
  minuteTimestamp(9, 25),
  minuteTimestamp(9, 30),
]);
assert.equal((await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' })).chartBarsRevision, secondaryAfterInterval.revision);

const cacheSummary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
assert.equal(cacheSummary.windowCount, 2);

const planState = await dispatchCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE);
assert.deepEqual(planState, {
  lastError: null,
  lastPlans: [
    {
      noFuture: true,
      paneId: 'secondary',
      reason: 'interval',
      displayTimeframe: 5,
      sessionStartTime: '2026-06-01T09:30:00.000Z',
      sourceTimeframe: 1,
      source: 'pane-intent',
      window: {
        anchor: '2026-06-01T09:32:00.000Z',
        ...requests[1],
      },
    },
  ],
  plannedCount: 2,
  status: 'planned',
});
assert.equal((await dispatchCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE)).loadedCount, 2);
assert.equal((await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE)).replacedCount, 2);
assert.equal((await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE)).projectedCount, 2);

await registry.stop();
unsubscribeProjected();
assert.equal(hasCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE), false);

console.log('v6 pane reload pipeline step 179 smoke passed');
