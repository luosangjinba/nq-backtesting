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

function initialBars() {
  return [
    { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
    { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
    { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
  ];
}

clearCommandsForTest();
clearEventsForTest();

const fetchCalls = [];
const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  return {
    bars: [
      { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
      { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
      { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
    ],
    history: { exhaustedBefore: true },
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(),
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

const mainLoaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(mainLoaded.status, 'loaded');
assert.equal(fetchCalls.length, 1);

const mainExhausted = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(mainExhausted.status, 'ignored');
assert.equal(mainExhausted.extension.reason, 'older-history-exhausted');
assert.equal(fetchCalls.length, 1);

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(),
  cursorTimestamp: 1780306320,
  paneId: 'secondary',
});

const secondaryLoaded = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'secondary',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(secondaryLoaded.status, 'loaded');
assert.equal(secondaryLoaded.extension.paneId, 'secondary');
assert.equal(secondaryLoaded.extension.loadedWindow.cacheHit, true);
assert.equal(fetchCalls.length, 1);

assert.deepEqual((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' })).bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
]);
assert.deepEqual((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' })).bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
]);

await registry.stop();

console.log('v6 continuous leftward history pane isolation step 151 smoke passed');
