import assert from 'node:assert/strict';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import {
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_PROJECTION_EVENTS,
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

const start = Date.parse('2026-05-31T18:00:00Z') / 1000;

function makeBar(index) {
  return {
    close: 100 + index + 0.25,
    high: 101 + index,
    low: 99 + index,
    open: 100 + index,
    timestamp: start + (index * 60),
  };
}

clearCommandsForTest();
clearEventsForTest();

const projectedEvents = [];
const unsubscribe = subscribeEvent(CHART_DATA_PROJECTION_EVENTS.PROJECTED, (payload) => {
  projectedEvents.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataProjectionRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.deepEqual(await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE), {
  lastProjection: null,
  projectionRevision: 0,
});

const result = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
  bars: Array.from({ length: 7 }, (_, index) => makeBar(index)),
  cursorTimestamp: start + (6 * 60),
  paneId: 'pane-2',
  sessionStartTimestamp: start,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});

assert.equal(result.paneId, 'pane-2');
assert.equal(result.projectionRevision, 1);
assert.equal(result.sourceBarCount, 7);
assert.equal(result.sourceTimeframe, 1);
assert.equal(result.targetTimeframe, 5);
assert.deepEqual(result.bars, [
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
assert.equal(result.buckets[0].complete, true);
assert.equal(result.buckets[1].complete, false);
assert.equal(result.buckets[1].cursorCapped, true);
assert.equal(projectedEvents.length, 1);
assert.deepEqual(projectedEvents[0], result);

result.bars[0].close = -1;
const state = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
assert.equal(state.lastProjection.bars[0].close, 104.25);
assert.equal(state.projectionRevision, 1);

await assert.rejects(
  () => dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
    bars: [],
    paneId: '',
  }),
  /paneId/,
);

await registry.stop();
unsubscribe();

assert.deepEqual(registry.snapshot(), {
  running: false,
  runtimes: ['runtime.chart-data-projection'],
  started: [],
});

console.log('v6 chart data projection owner step 194 smoke passed');
