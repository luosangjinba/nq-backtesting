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

function initialBars(offset = 0) {
  return [
    { close: 100.5 + offset, high: 101 + offset, low: 100 + offset, open: 100 + offset, timestamp: 1780306200 },
    { close: 101.5 + offset, high: 102 + offset, low: 101 + offset, open: 101 + offset, timestamp: 1780306260 },
    { close: 102.5 + offset, high: 103 + offset, low: 102 + offset, open: 102 + offset, timestamp: 1780306320 },
  ];
}

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
    history: { exhaustedBefore: true },
  }],
]);

const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  const record = windows.get(`${window.start}|${window.end}`);
  return {
    bars: (record?.bars || []).map((bar) => ({ ...bar })),
    history: record?.history ? { ...record.history } : { exhaustedBefore: true },
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(0),
  cursorTimestamp: 1780306320,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(100),
  cursorTimestamp: 1780306320,
  paneId: 'pane-b',
});

const paneBInitial = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
for (const expectedStart of ['2026-06-01 09:27', '2026-06-01 09:24']) {
  const loaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
    instrument: 'NQ',
    paneId: 'pane-a',
    timeframe: '1m',
    visibleRange: { from: -3.2, to: 15 },
  });
  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.extension.paneId, 'pane-a');
  assert.equal(loaded.extension.plannedWindow.start, expectedStart);
}

const paneAExhausted = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'pane-a',
  timeframe: '1m',
  visibleRange: { from: -9.2, to: 15 },
});
assert.equal(paneAExhausted.status, 'ignored');
assert.equal(paneAExhausted.extension.reason, 'older-history-exhausted');
assert.equal(fetchCalls.length, 2);
assert.deepEqual(await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' }), paneBInitial);

const paneBLoaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'pane-b',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(paneBLoaded.status, 'loaded');
assert.equal(paneBLoaded.extension.paneId, 'pane-b');
assert.equal(paneBLoaded.extension.loadedWindow.cacheHit, true);
assert.equal(fetchCalls.length, 2);

const paneA = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' });
const paneB = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
assert.deepEqual(paneA.bars.map((bar) => bar.timestamp), [
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
assert.deepEqual(paneB.bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
]);
assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY), {
  barCount: 6,
  keys: [
    'NQ|1|2026-06-01 09:24|2026-06-01 09:26',
    'NQ|1|2026-06-01 09:27|2026-06-01 09:29',
  ],
  windowCount: 2,
});

await registry.stop();

console.log('v6 multi-pane leftward history step 155 smoke passed');
