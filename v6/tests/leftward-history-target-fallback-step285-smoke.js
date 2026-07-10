import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_HISTORY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../src/chart-history/leftward-history-extension-runtime.js';
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

clearCommandsForTest();
clearEventsForTest();

const sourceFetchCalls = [];
const targetFetchCalls = [];
const initialSourceBars = [
  { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
  { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
  { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
];

function makeSourceBars() {
  return Array.from({ length: 20 }, (_, index) => ({
    close: 80 + index + 0.5,
    high: 81 + index,
    low: 79 + index,
    open: 80 + index,
    timestamp: 1780305000 + (index * 60),
  }));
}

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    sourceFetchCalls.push({ ...window });
    return {
      bars: makeSourceBars(),
      history: { exhaustedBefore: false },
      requestedRange: { end: window.end, start: window.start },
    };
  },
  fetchTargetBars: async (window) => {
    targetFetchCalls.push({ ...window });
    throw new Error('planned target history failure');
  },
}));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialSourceBars,
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

const state = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  displayTimeframe: 5,
  instrument: 'NQ',
  paneId: 'main',
  sourceTimeframe: 1,
  targetHistory: {
    enabled: true,
  },
  visibleRange: { from: -3.2, to: 15 },
});

assert.equal(state.status, 'loaded');
assert.equal(targetFetchCalls.length, 3);
assert.equal(sourceFetchCalls.length, 1);
assert.deepEqual(sourceFetchCalls[0], {
  bounded: true,
  canvasLeftBoundary: '2026-06-01 09:10',
  direction: 'backward',
  end: '2026-06-01 09:29',
  estimatedBars: 20,
  historyRequest: 'older-window',
  instrument: 'NQ',
  requestCap: 'canvas-left',
  start: '2026-06-01 09:10',
  timeframe: 1,
});
assert.deepEqual(state.extension.targetHistory, {
  errorMessage: 'planned target history failure',
  reason: 'target-history-load-failed',
  status: 'fallback',
  window: null,
});
assert.equal(state.extension.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(state.extension.projectionSource.sourceTimeframe, 1);
assert.equal(state.extension.projectionSource.targetTimeframe, 5);
assert.equal(state.extension.prependedBarCount, 4);

const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
assert.deepEqual(sourceRecord.bars.map((bar) => bar.timestamp), [
  ...makeSourceBars().map((bar) => bar.timestamp),
  ...initialSourceBars.map((bar) => bar.timestamp),
]);

await registry.stop();

console.log('v6 leftward history target fallback step285 smoke passed');
