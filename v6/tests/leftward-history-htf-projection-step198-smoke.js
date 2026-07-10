import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../src/chart-history/leftward-history-extension-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_HISTORY_COMMANDS,
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

function makeBar(offsetMinutes, price) {
  const timestamp = 1780306200 + (offsetMinutes * 60);
  return {
    close: price + 0.5,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp,
  };
}

clearCommandsForTest();
clearEventsForTest();

const fetchCalls = [];
const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  if (window.start === '2026-06-01 09:00' && window.end === '2026-06-01 09:29') {
    return {
      bars: Array.from({ length: 30 }, (_, index) => makeBar(index - 30, 70 + index)),
      history: { exhaustedBefore: false },
      timeframe: 1,
    };
  }
  if (window.estimatedBars === 17280) {
    return {
      bars: Array.from({ length: 17280 }, (_, index) => makeBar(index - 17280, 20 + index)),
      history: { exhaustedBefore: false },
      timeframe: 1,
    };
  }
  return {
    bars: [],
    history: { exhaustedBefore: true },
    timeframe: 1,
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 40000 }));
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({
  cursorTime: '2026-06-01T09:30:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
}));
let paneDisplayTimeframe = 5;
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  displayTimeframe: paneDisplayTimeframe,
  id: paneId,
  instrument: 'NQ',
  timeframe: '1m',
}));

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    {
      close: 104.5,
      high: 105,
      low: 99,
      open: 100,
      timestamp: 1780306200,
    },
  ],
  cursorTimestamp: 1780306200,
  paneId: 'pane-htf',
});

const loaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'pane-htf',
  timeframe: '1m',
  visibleRange: { from: -5.1, to: 15 },
});
const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-htf' });
const projectionState = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
const cacheSummary = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);

assert.equal(loaded.status, 'loaded', loaded.error || 'HTF leftward history should load');
assert.equal(loaded.extension.prependedBarCount, 6);
assert.deepEqual(loaded.extension.projectionSource, {
  bucketCount: 6,
  owner: 'runtime.chart-data-projection',
  projectionRevision: 1,
  sourceBarCount: 30,
  sourceTimeframe: 1,
  targetTimeframe: 5,
});
assert.equal(projectionState.projectionRevision, 1);
assert.equal(projectionState.lastProjection.paneId, 'pane-htf');
assert.deepEqual(chartRecord.bars.map((bar) => ({
  close: bar.close,
  high: bar.high,
  low: bar.low,
  open: bar.open,
  timestamp: bar.timestamp,
})), [
  {
    close: 74.5,
    high: 75,
    low: 69,
    open: 70,
    timestamp: 1780304400,
  },
  {
    close: 79.5,
    high: 80,
    low: 74,
    open: 75,
    timestamp: 1780304700,
  },
  {
    close: 84.5,
    high: 85,
    low: 79,
    open: 80,
    timestamp: 1780305000,
  },
  {
    close: 89.5,
    high: 90,
    low: 84,
    open: 85,
    timestamp: 1780305300,
  },
  {
    close: 94.5,
    high: 95,
    low: 89,
    open: 90,
    timestamp: 1780305600,
  },
  {
    close: 99.5,
    high: 100,
    low: 94,
    open: 95,
    timestamp: 1780305900,
  },
  {
    close: 104.5,
    high: 105,
    low: 99,
    open: 100,
    timestamp: 1780306200,
  },
]);
assert.deepEqual(fetchCalls.map((item) => ({
  end: item.end,
  estimatedBars: item.estimatedBars,
  requestCap: item.requestCap,
  start: item.start,
  timeframe: item.timeframe,
})), [
  {
    end: '2026-06-01 09:29',
    estimatedBars: 30,
    requestCap: 'canvas-left',
    start: '2026-06-01 09:00',
    timeframe: 1,
  },
]);
assert.deepEqual(cacheSummary, {
  barCount: 30,
  keys: ['NQ|1|2026-06-01 09:00|2026-06-01 09:29'],
  windowCount: 1,
});

paneDisplayTimeframe = '1D';
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    {
      close: 104.5,
      high: 105,
      low: 99,
      open: 100,
      timestamp: 1780306200,
    },
  ],
  cursorTimestamp: 1780306200,
  paneId: 'pane-daily',
});

const dailyLoaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'pane-daily',
  timeframe: '1m',
  visibleRange: { from: -1, to: 15 },
});
const dailyProjectionState = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
const dailyChartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-daily' });

assert.equal(dailyLoaded.status, 'loaded', dailyLoaded.error || '1D leftward history should load');
assert.equal(dailyLoaded.extension.plannedWindow.estimatedBars, 17280);
assert.equal(dailyLoaded.extension.projectionSource.targetTimeframe, '1D');
assert.equal(dailyLoaded.extension.projectionSource.sourceBarCount, 17280);
assert.equal(dailyProjectionState.lastProjection.targetTimeframe, '1D');
assert.equal(dailyChartRecord.bars.length > 1, true);

await registry.stop();

console.log('v6 leftward history HTF projection step 198 smoke passed');
