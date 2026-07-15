import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_HISTORY_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';
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

function createFakeTimer() {
  let nextId = 1;
  const intervals = new Map();
  return {
    clearInterval(id) {
      intervals.delete(id);
    },
    intervalCount() {
      return intervals.size;
    },
    intervalDelay() {
      return [...intervals.values()][0]?.delayMs ?? null;
    },
    setInterval(callback, delayMs) {
      const id = nextId;
      nextId += 1;
      intervals.set(id, { callback, delayMs });
      return id;
    },
    async tick() {
      [...intervals.values()].forEach((interval) => interval.callback());
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

function replayState(cursorIndex, status = 'playing') {
  return {
    cursorIndex,
    cursorTime: `2026-06-01T09:${String(30 + cursorIndex).padStart(2, '0')}:00.000Z`,
    revealedCount: cursorIndex + 1,
    sessionId: 'auto-history-session',
    status,
    symbol: 'NQ',
    timeframe: '1m',
  };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const fetchCalls = [];
const historyWindows = new Map([
  ['2026-06-01 09:27|2026-06-01 09:29', [
    { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
    { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
    { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
  ]],
  ['2026-06-01 09:24|2026-06-01 09:26', [
    { close: 94.5, high: 95, low: 94, open: 94, timestamp: 1780305840 },
    { close: 95.5, high: 96, low: 95, open: 95, timestamp: 1780305900 },
    { close: 96.5, high: 97, low: 96, open: 96, timestamp: 1780305960 },
  ]],
]);
const nextWindows = new Map([
  ['2026-06-01 09:33|2026-06-01 09:33', [
    { close: 103.5, high: 104, low: 103, open: 103, timestamp: 1780306380 },
  ]],
  ['2026-06-01 09:34|2026-06-01 09:34', [
    { close: 104.5, high: 105, low: 104, open: 104, timestamp: 1780306440 },
  ]],
]);

const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  const key = `${window.start}|${window.end}`;
  const bars = window.historyRequest === 'older-window'
    ? historyWindows.get(key)
    : nextWindows.get(key);
  return {
    bars: (bars || []).map((bar) => ({ ...bar })),
    history: window.historyRequest === 'older-window' ? { exhaustedBefore: false } : null,
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 2;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState(cursorIndex));
registerCommand(REPLAY_COMMANDS.PLAY, () => replayState(cursorIndex, 'playing'));
registerCommand(REPLAY_COMMANDS.PAUSE, () => replayState(cursorIndex, 'paused'));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  return replayState(cursorIndex, cursorIndex >= 4 ? 'ended' : 'playing');
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

for (const expectedStart of ['2026-06-01 09:27', '2026-06-01 09:24']) {
  const history = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
    instrument: 'NQ',
    paneId: 'main',
    timeframe: '1m',
    visibleRange: { from: -3.2, to: 15 },
  });
  assert.equal(history.status, 'loaded');
  assert.equal(history.extension.plannedWindow.start, expectedStart);
}
assert.equal(cursorIndex, 2);

const beforeAutoChart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
const beforeAutoCache = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { speed: 4 });
assert.equal(started.status, 'playing');
assert.equal(started.playing, true);
assert.equal(fakeTimer.intervalDelay(), 125);

const firstTickStartedAt = Date.now();
await fakeTimer.tick();
const firstTickLatencyMs = Date.now() - firstTickStartedAt;
let autoState = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
assert.equal(firstTickLatencyMs < 50, true);
assert.equal(autoState.status, 'playing');
assert.equal(autoState.lastTick.status, 'advanced');
assert.equal(autoState.lastTick.replayState.cursorIndex, 3);

const secondTickStartedAt = Date.now();
await fakeTimer.tick();
const secondTickLatencyMs = Date.now() - secondTickStartedAt;
autoState = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
assert.equal(secondTickLatencyMs < 50, true);
assert.equal(autoState.status, 'ended');
assert.equal(autoState.playing, false);
assert.equal(autoState.lastTick.replayState.cursorIndex, 4);
assert.equal(fakeTimer.intervalCount(), 0);

const afterAutoChart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(afterAutoChart.bars.map((bar) => bar.timestamp), [
  1780305840,
  1780305900,
  1780305960,
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
  1780306380,
  1780306440,
]);
assert.equal(afterAutoChart.bars.length, beforeAutoChart.bars.length + 2);
assert.equal((await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY)).windowCount, beforeAutoCache.windowCount + 2);
assert.deepEqual(fetchCalls.map((call) => call.historyRequest || call.direction), [
  'older-window',
  'older-window',
  'backward',
  'backward',
]);

await registry.stop();

console.log('v6 auto play continuous history step 152 smoke passed');
