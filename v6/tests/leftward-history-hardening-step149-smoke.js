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

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

clearCommandsForTest();
clearEventsForTest();

const fetchCalls = [];
const deferred = createDeferred();
let exhaustedFetchCount = 0;
const fetchBars = async (window) => {
  fetchCalls.push(window);
  if (window.start === '2026-06-01 09:27') {
    await deferred.promise;
    return {
      bars: [
        { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
        { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
        { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
      ],
    };
  }
  exhaustedFetchCount += 1;
  return {
    bars: [],
    history: { exhaustedBefore: true },
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

const first = dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
const second = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(second.status, 'ignored');
assert.equal(second.extension.reason, 'older-window-request-in-flight');
assert.equal(fetchCalls.length, 1);

deferred.resolve();
const firstState = await first;
assert.equal(firstState.status, 'loaded');
assert.equal(firstState.extension.prependedBarCount, 3);
assert.equal(fetchCalls.length, 1);
assert.deepEqual((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' })).bars.map((bar) => bar.timestamp), [
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
  visibleRange: { from: -10, to: 15 },
});
assert.equal(exhausted.status, 'ignored');
assert.equal(exhausted.extension.reason, 'no-older-bars-returned');
assert.equal(exhaustedFetchCount, 1);

const exhaustedRepeat = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -10, to: 15 },
});
assert.equal(exhaustedRepeat.status, 'ignored');
assert.equal(exhaustedRepeat.extension.reason, 'older-window-exhausted');
assert.equal(exhaustedFetchCount, 1);

assert.equal((await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY)).windowCount, 2);

await registry.stop();

console.log('v6 leftward history hardening step 149 smoke passed');
