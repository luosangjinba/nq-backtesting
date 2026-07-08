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

const fetchBars = async (window) => {
  if (window.start === '2026-06-01 09:24' && window.end === '2026-06-01 09:26') {
    return {
      bars: [
        { close: 94.5, high: 95, low: 94, open: 94, timestamp: 1780305840 },
        { close: 95.5, high: 96, low: 95, open: 95, timestamp: 1780305900 },
        { close: 96.5, high: 97, low: 96, open: 96, timestamp: 1780305960 },
      ],
      history: { exhaustedBefore: false },
    };
  }
  return {
    bars: [],
    history: { exhaustedBefore: false },
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime({ emptyGapScanLimit: 2 }));
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
    { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
    { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});

const state = await dispatchCommand(CHART_HISTORY_COMMANDS.GET_STATE);
assert.equal(state.status, 'loaded');
assert.deepEqual(state.recentRequests.map((request) => request.status), ['empty', 'loaded']);
assert.deepEqual(state.recentRequests.map((request) => request.gapScanIndex), [0, 1]);
assert.deepEqual(state.recentRequests.map((request) => request.barCount), [0, 3]);
assert.deepEqual(state.recentRequests.map((request) => [
  request.plannedWindow.start,
  request.plannedWindow.end,
]), [
  ['2026-06-01 09:27', '2026-06-01 09:29'],
  ['2026-06-01 09:24', '2026-06-01 09:26'],
]);
assert.equal(state.recentRequests[0].reason, 'empty-window');
assert.equal(state.recentRequests[1].reason, null);

await registry.stop();

console.log('v6 leftward history debug state step 189 smoke passed');
