import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_HISTORY_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../src/chart-history/leftward-history-extension-runtime.js';
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

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function replayState(cursorIndex) {
  return {
    cursorIndex,
    cursorTime: `2026-06-01T09:${String(30 + cursorIndex).padStart(2, '0')}:00.000Z`,
    revealedCount: cursorIndex + 1,
    sessionId: 'history-speed-session',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
  };
}

clearCommandsForTest();
clearEventsForTest();

const olderDeferred = createDeferred();
const fetchCalls = [];
const fetchBars = async (window) => {
  fetchCalls.push(window);
  if (window.historyRequest === 'older-window') {
    await olderDeferred.promise;
    return {
      bars: [
        { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
        { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
        { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
      ],
    };
  }
  return {
    bars: [
      { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
      { close: 103.5, high: 104, low: 103, open: 103, timestamp: 1780306380 },
    ],
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 2;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState(cursorIndex));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  return replayState(cursorIndex);
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({
  period: '1m',
  sync: false,
}));

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
    { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
    { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

const historyPromise = dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  paneId: 'main',
  visibleRange: { from: -3.2, to: 15 },
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0].historyRequest, 'older-window');

const nextStartedAt = Date.now();
const next = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
const nextLatencyMs = Date.now() - nextStartedAt;
assert.equal(next.status, 'advanced');
assert.equal(next.error, null);
assert.equal(next.advanced.replayState.cursorTime, '2026-06-01T09:33:00.000Z');
assert.equal(next.advanced.appendedBarCount, 1);
assert.equal(nextLatencyMs < 50, true);
assert.deepEqual((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' })).bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306260,
  1780306320,
  1780306380,
]);

olderDeferred.resolve();
const history = await historyPromise;
assert.equal(history.status, 'loaded');
assert.equal(history.extension.prependedBarCount, 3);
assert.deepEqual((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' })).bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
  1780306380,
]);
assert.deepEqual(fetchCalls.map((call) => call.historyRequest || call.direction), [
  'older-window',
  'backward',
]);

await registry.stop();

console.log('v6 replay speed history inflight step 150 smoke passed');
