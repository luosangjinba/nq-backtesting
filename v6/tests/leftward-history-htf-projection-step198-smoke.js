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
  if (window.start === '2026-06-01 09:25' && window.end === '2026-06-01 09:29') {
    return {
      bars: [
        makeBar(-5, 95),
        makeBar(-4, 96),
        makeBar(-3, 97),
        makeBar(-2, 98),
        makeBar(-1, 99),
      ],
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
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 20 }));
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
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  displayTimeframe: 5,
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
assert.equal(loaded.extension.prependedBarCount, 1);
assert.deepEqual(loaded.extension.projectionSource, {
  bucketCount: 1,
  owner: 'runtime.chart-data-projection',
  projectionRevision: 1,
  sourceBarCount: 5,
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
    estimatedBars: 5,
    requestCap: 'canvas-left',
    start: '2026-06-01 09:25',
    timeframe: 1,
  },
]);
assert.deepEqual(cacheSummary, {
  barCount: 5,
  keys: ['NQ|1|2026-06-01 09:25|2026-06-01 09:29'],
  windowCount: 1,
});

await registry.stop();

console.log('v6 leftward history HTF projection step 198 smoke passed');
