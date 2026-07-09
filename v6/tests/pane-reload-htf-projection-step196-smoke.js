import assert from 'node:assert/strict';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_EVENTS,
  PANE_INTENT_RELOAD_DATA_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createPaneIntentReloadChartDataRuntime } from '../src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js';
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

function makeBar(index) {
  return {
    close: 100 + index + 0.25,
    high: 101 + index,
    low: 99 + index,
    open: 100 + index,
    timestamp: start + (index * 60),
  };
}

const windows = new Map([
  ['main', {
    bars: [makeBar(0), makeBar(1), makeBar(2)],
    timeframe: 1,
  }],
  ['secondary', {
    bars: Array.from({ length: 7 }, (_, index) => makeBar(index)),
    timeframe: 1,
  }],
]);

clearCommandsForTest();
clearEventsForTest();

const replacedEvents = [];
subscribeEvent(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, (records) => {
  replacedEvents.push(records);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createPaneIntentReloadChartDataRuntime());
await registry.start({ emitEvent, subscribeEvent });

registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (window) => {
  const record = windows.get(window.paneKey);
  return {
    bars: record.bars,
    bounded: true,
    cacheHit: true,
    end: window.end,
    instrument: window.instrument,
    key: `${window.instrument}|${record.timeframe}|${window.start}|${window.end}`,
    start: window.start,
    timeframe: record.timeframe,
  };
});

emitEvent(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, [
  {
    noFuture: true,
    paneId: 'main',
    reason: 'symbol',
    source: 'pane-intent',
    window: {
      end: '2026-05-31 18:02',
      instrument: 'NQ',
      paneKey: 'main',
      start: '2026-05-31 18:00',
      timeframe: 1,
    },
  },
  {
    noFuture: true,
    paneId: 'secondary',
    reason: 'interval',
    source: 'pane-intent',
    window: {
      end: '2026-05-31 18:06',
      instrument: 'ES',
      paneKey: 'secondary',
      start: '2026-05-31 18:00',
      timeframe: 5,
    },
  },
]);
await new Promise((resolve) => setTimeout(resolve, 0));

const main = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
const secondary = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
const projectionState = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
const reloadState = await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE);

assert.deepEqual(main.bars.map((bar) => bar.timestamp), [
  start,
  start + 60,
  start + 120,
]);
assert.deepEqual(secondary.bars.map((bar) => ({
  close: bar.close,
  high: bar.high,
  low: bar.low,
  open: bar.open,
  timestamp: bar.timestamp,
})), [
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
assert.equal(projectionState.projectionRevision, 1);
assert.equal(projectionState.lastProjection.paneId, 'secondary');
assert.equal(projectionState.lastProjection.sourceTimeframe, 1);
assert.equal(projectionState.lastProjection.targetTimeframe, 5);
assert.equal(projectionState.lastProjection.buckets[1].cursorCapped, true);
assert.equal(reloadState.replacedCount, 2);
assert.equal(reloadState.lastReplaced[0].projectionSource, null);
assert.deepEqual(reloadState.lastReplaced[1].projectionSource, {
  bucketCount: 2,
  owner: 'runtime.chart-data-projection',
  projectionRevision: 1,
  sourceBarCount: 7,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});
assert.equal(replacedEvents.length, 1);
assert.equal(replacedEvents[0][1].projectionSource.owner, 'runtime.chart-data-projection');

await registry.stop();

console.log('v6 pane reload HTF projection step 196 smoke passed');
