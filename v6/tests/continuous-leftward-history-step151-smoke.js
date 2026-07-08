import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
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

const fetchCalls = [];
const windows = new Map([
  ['2026-06-01 09:27|2026-06-01 09:29', {
    bars: [
      { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
      { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
      { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
    ],
    history: { exhaustedBefore: false },
  }],
  ['2026-06-01 09:24|2026-06-01 09:26', {
    bars: [
      { close: 94.5, high: 95, low: 94, open: 94, timestamp: 1780305840 },
      { close: 95.5, high: 96, low: 95, open: 95, timestamp: 1780305900 },
      { close: 96.5, high: 97, low: 96, open: 96, timestamp: 1780305960 },
    ],
    history: { exhaustedBefore: false },
  }],
  ['2026-06-01 09:21|2026-06-01 09:23', {
    bars: [
      { close: 91.5, high: 92, low: 91, open: 91, timestamp: 1780305660 },
      { close: 92.5, high: 93, low: 92, open: 92, timestamp: 1780305720 },
      { close: 93.5, high: 94, low: 93, open: 93, timestamp: 1780305780 },
    ],
    history: { exhaustedBefore: true },
  }],
]);

const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  const record = windows.get(`${window.start}|${window.end}`);
  if (!record) {
    return {
      bars: [],
      history: { exhaustedBefore: true },
    };
  }
  return {
    bars: record.bars.map((bar) => ({ ...bar })),
    history: { ...record.history },
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
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

for (const expectedStart of ['2026-06-01 09:27', '2026-06-01 09:24', '2026-06-01 09:21']) {
  const state = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
    instrument: 'NQ',
    paneId: 'main',
    timeframe: '1m',
    visibleRange: { from: -3.2, to: 15 },
  });
  assert.equal(state.status, 'loaded');
  assert.equal(state.extension.prependedBarCount, 3);
  assert.equal(state.extension.plannedWindow.start, expectedStart);
  assert.equal(state.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(state.extension.plannedWindow.historyRequest, 'older-window');
}

assert.equal(fetchCalls.length, 3);
assert.deepEqual(fetchCalls.map((call) => [call.start, call.end]), [
  ['2026-06-01 09:27', '2026-06-01 09:29'],
  ['2026-06-01 09:24', '2026-06-01 09:26'],
  ['2026-06-01 09:21', '2026-06-01 09:23'],
]);

const chart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(chart.bars.map((bar) => bar.timestamp), [
  1780305660,
  1780305720,
  1780305780,
  1780305840,
  1780305900,
  1780305960,
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
]);

const exhausted = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -12, to: 15 },
});
assert.equal(exhausted.status, 'ignored');
assert.equal(exhausted.extension.reason, 'older-history-exhausted');
assert.equal(fetchCalls.length, 3);

assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY), {
  barCount: 9,
  keys: [
    'NQ|1|2026-06-01 09:21|2026-06-01 09:23',
    'NQ|1|2026-06-01 09:24|2026-06-01 09:26',
    'NQ|1|2026-06-01 09:27|2026-06-01 09:29',
  ],
  windowCount: 3,
});

await registry.stop();

console.log('v6 continuous leftward history step 151 smoke passed');
