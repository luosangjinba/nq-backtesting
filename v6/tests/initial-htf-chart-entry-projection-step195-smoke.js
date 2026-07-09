import assert from 'node:assert/strict';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from '../src/chart-entry/chart-entry-projection-preparation-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_EVENTS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

const start = Date.parse('2026-05-31T18:00:00Z') / 1000;
const bars = Array.from({ length: 7 }, (_, index) => ({
  close: 100 + index + 0.25,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: start + (index * 60),
}));
const window = {
  bounded: true,
  end: '2026-05-31 18:06',
  estimatedBars: 7,
  instrument: 'NQ',
  start: '2026-05-31 18:00',
  timeframe: 1,
};
const plan = {
  anchor: '2026-05-31T18:06:00.000Z',
  context: {
    loadedWindow: window,
    plannedWindow: window,
    record: {
      barCount: 7,
      cacheHit: false,
      key: 'NQ|1|2026-05-31 18:00|2026-05-31 18:06',
    },
  },
  cursorTime: '2026-05-31T18:06:00.000Z',
  latestOffsetBars: 12,
  paneId: 'main',
  prefixBars: 120,
  sessionId: 'session-initial-htf',
  spanBars: 80,
};

clearCommandsForTest();
clearEventsForTest();

const preparedEvents = [];
const projectedEvents = [];
const forbiddenCalls = [];
subscribeEvent(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, (payload) => {
  preparedEvents.push(payload);
});
subscribeEvent(CHART_DATA_PROJECTION_EVENTS.PROJECTED, (payload) => {
  projectedEvents.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartEntryProjectionPreparationRuntime());
await registry.start({ emitEvent, subscribeEvent });

registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (payload) => {
  assert.deepEqual(payload, window);
  return {
    ...window,
    bars,
    cacheHit: true,
    key: 'NQ|1|2026-05-31 18:00|2026-05-31 18:06',
  };
});
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  active: true,
  displayTimeframe: 5,
  id: paneId,
  instrument: 'NQ',
}));
[
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  DEFAULT_WALL_COMMANDS.LOAD,
  REPLAY_COMMANDS.NEXT,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

emitEvent(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, plan);
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE);
assert.equal(state.status, 'prepared');
assert.equal(state.error, null);
assert.equal(projectedEvents.length, 1);
assert.equal(preparedEvents.length, 1);
assert.equal(forbiddenCalls.length, 0);
assert.deepEqual(state.prepared.chartReplacePayload.bars, [
  {
    close: 104.25,
    high: 105,
    low: 99,
    open: 100,
    timestamp: start,
  },
  {
    close: 106.25,
    high: 107,
    low: 104,
    open: 105,
    timestamp: start + 300,
  },
]);
assert.equal(state.prepared.chartReplacePayload.cursorTimestamp, start + (6 * 60));
assert.deepEqual(state.prepared.viewportIntentPayload, {
  cursorTimestamp: start + (6 * 60),
  latestOffsetBars: 12,
  paneId: 'main',
  spanBars: 80,
});
assert.deepEqual(state.prepared.projectionSource, {
  bucketCount: 2,
  owner: 'runtime.chart-data-projection',
  projectionRevision: 1,
  sourceBarCount: 7,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});
assert.equal(projectedEvents[0].paneId, 'main');
assert.equal(projectedEvents[0].targetTimeframe, 5);
assert.equal(projectedEvents[0].buckets[1].complete, false);
assert.equal(projectedEvents[0].buckets[1].cursorCapped, true);

await registry.stop();

console.log('v6 initial HTF chart entry projection step 195 smoke passed');
