import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
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

function createFakeTimer() {
  let nextId = 1;
  const intervals = new Map();
  return {
    clearInterval(id) {
      intervals.delete(id);
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

const sessionStart = Date.parse('2026-06-01T09:30:00.000Z') / 1000;

function makeBar(offset, price) {
  return {
    close: price + 0.5,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp: sessionStart + (offset * 60),
  };
}

function replayState(cursorIndex, status = 'playing') {
  return {
    cursorIndex,
    cursorTime: `2026-06-01T09:${String(30 + cursorIndex).padStart(2, '0')}:00.000Z`,
    endTime: '2026-06-01T09:40:00.000Z',
    revealedCount: cursorIndex + 1,
    sessionId: 'auto-play-htf',
    startTime: '2026-06-01T09:30:00.000Z',
    status,
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 11,
  };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const fetchCalls = [];
const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  return {
    bars: [
      makeBar(-3, 97),
      makeBar(-2, 98),
      makeBar(-1, 99),
      makeBar(0, 100),
      makeBar(1, 101),
      makeBar(2, 102),
    ],
    history: null,
    timeframe: 1,
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 0;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState(cursorIndex));
registerCommand(REPLAY_COMMANDS.PLAY, () => replayState(cursorIndex, 'playing'));
registerCommand(REPLAY_COMMANDS.PAUSE, () => replayState(cursorIndex, 'paused'));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  return replayState(cursorIndex, 'playing');
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({
  period: '1m',
  sync: false,
}));
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  active: true,
  displayTimeframe: 5,
  id: paneId,
  instrument: 'NQ',
  timeframe: '1m',
}));

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    {
      close: 100.5,
      high: 101,
      low: 99,
      open: 100,
      timestamp: sessionStart,
    },
  ],
  cursorTimestamp: sessionStart,
  paneId: 'main',
});

const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
  paneId: 'main',
  speed: 4,
});
assert.equal(started.status, 'playing');

await fakeTimer.tick();
let manualNext = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE);
let chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.equal(manualNext.status, 'advanced');
assert.equal(manualNext.advanced.loadedWindow.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(manualNext.advanced.loadedWindow.projectionSource.targetTimeframe, 5);
assert.deepEqual(chartRecord.bars, [
  {
    close: 101.5,
    high: 102,
    low: 99,
    open: 100,
    time: '2026-06-01T09:30:00.000Z',
    timestamp: sessionStart,
  },
]);

await fakeTimer.tick();
manualNext = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE);
chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
const projectionState = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);

assert.equal(manualNext.status, 'advanced');
assert.equal(manualNext.advanced.loadedWindow.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(manualNext.advanced.loadedWindow.projectionSource.targetTimeframe, 5);
assert.deepEqual(fetchCalls.map((call) => ({
  direction: call.direction,
  end: call.end,
  start: call.start,
  timeframe: call.timeframe,
})), [
  {
    direction: 'backward',
    end: '2026-06-01 09:31',
    start: '2026-06-01 09:27',
    timeframe: 1,
  },
  {
    direction: 'backward',
    end: '2026-06-01 09:32',
    start: '2026-06-01 09:28',
    timeframe: 1,
  },
]);
assert.equal(projectionState.projectionRevision, 2);
assert.deepEqual(chartRecord.bars, [
  {
    close: 102.5,
    high: 103,
    low: 99,
    open: 100,
    time: '2026-06-01T09:30:00.000Z',
    timestamp: sessionStart,
  },
]);
assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY), {
  barCount: 10,
  keys: [
    'NQ|1|2026-06-01 09:27|2026-06-01 09:31',
    'NQ|1|2026-06-01 09:28|2026-06-01 09:32',
  ],
  windowCount: 2,
});

await registry.stop();

console.log('v6 auto-play HTF projection step 199 smoke passed');
