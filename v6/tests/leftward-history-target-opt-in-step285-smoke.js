import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_HISTORY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
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
const sourceBars = [
  { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
  { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
  { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
];

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    sourceFetchCalls.push({ ...window });
    throw new Error('source window should not load for target-history opt-in');
  },
  fetchTargetBars: async (window) => {
    targetFetchCalls.push({ ...window });
    return {
      bars: [
        { close: 90, high: 92, low: 88, open: 89, timestamp: 1779728400 },
        { close: 95, high: 96, low: 91, open: 90, timestamp: 1779757200 },
      ],
      requestedRange: { end: window.end, start: window.start },
      timing: { source: 'target-fetch' },
    };
  },
}));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: sourceBars,
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

const state = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  displayTimeframe: 480,
  instrument: 'NQ',
  paneId: 'main',
  sourceTimeframe: 1,
  targetHistory: {
    enabled: true,
  },
  visibleRange: { from: -3.2, to: 15 },
});

assert.equal(state.status, 'loaded');
assert.equal(sourceFetchCalls.length, 0);
assert.equal(targetFetchCalls.length, 1);
assert.deepEqual(targetFetchCalls[0], {
  bounded: true,
  bucketType: 'fixed-duration',
  dataKind: 'target-display',
  end: '2026-06-01 09:29',
  estimatedBars: 20,
  instrument: 'NQ',
  start: '2026-05-25 17:30',
  timeframe: '8h',
});
assert.equal(state.extension.prependedBarCount, 2);
assert.equal(state.extension.projectionSource.owner, 'runtime.bar-data');
assert.equal(state.extension.projectionSource.sourceTimeframe, 1);
assert.equal(state.extension.projectionSource.targetTimeframe, '8h');
assert.equal(state.extension.targetHistory.status, 'applied');
assert.equal(state.extension.targetHistory.reason, 'target-history-opt-in');
assert.equal(state.extension.targetHistory.barCount, 2);

const chart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(chart.bars.map((bar) => bar.timestamp), [
  1779728400,
  1779757200,
  1780306200,
  1780306260,
  1780306320,
]);

const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
assert.deepEqual(sourceRecord.bars.map((bar) => bar.timestamp), sourceBars.map((bar) => bar.timestamp));

await registry.stop();

console.log('v6 leftward history target opt-in step285 smoke passed');
