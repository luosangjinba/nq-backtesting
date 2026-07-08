import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
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
  let id = 0;
  const intervals = new Map();
  return {
    clearInterval(timerId) {
      intervals.delete(timerId);
    },
    setInterval(callback, delayMs) {
      id += 1;
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
    sessionId: 'multi-pane-replay',
    status,
    symbol: 'NQ',
    timeframe: '1m',
  };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const fetchCalls = [];
function timestampFromWindowTime(value) {
  const text = String(value || '');
  const iso = text.includes('T') ? text : `${text.replace(' ', 'T')}:00.000Z`;
  return Math.floor(new Date(iso).valueOf() / 1000);
}
const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  const cursorTimestamp = timestampFromWindowTime(window.end || window.anchor);
  return {
    bars: [
      { close: 100 + fetchCalls.length, high: 101 + fetchCalls.length, low: 99 + fetchCalls.length, open: 100 + fetchCalls.length, timestamp: cursorTimestamp },
    ],
    history: null,
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 1;
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
    { close: 101, high: 102, low: 100, open: 100, timestamp: 1780306260 },
  ],
  cursorTimestamp: 1780306260,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 201, high: 202, low: 200, open: 200, timestamp: 1780306260 },
  ],
  cursorTimestamp: 1780306260,
  paneId: 'pane-b',
});
const paneBBefore = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });

const nextA = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-a' });
assert.equal(nextA.status, 'advanced');
assert.equal(nextA.advanced.chartRecord.paneId, 'pane-a');
assert.equal((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' })).bars.length, 2);
assert.deepEqual(await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' }), paneBBefore);

const nextBoth = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneIds: ['pane-a', 'pane-b'] });
assert.equal(nextBoth.status, 'advanced');
assert.deepEqual(nextBoth.advanced.chartRecords.map((record) => record.paneId), ['pane-a', 'pane-b']);
assert.equal((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' })).bars.length, 3);
assert.equal((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' })).bars.length, 2);
assert.equal(nextBoth.advanced.replayState.cursorIndex, 3);

const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
  paneIds: ['pane-a', 'pane-b'],
  speed: 4,
});
assert.equal(started.paneId, 'pane-a');
assert.deepEqual(started.paneIds, ['pane-a', 'pane-b']);
await fakeTimer.tick();
await fakeTimer.tick();
const paneAAfter = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-a' });
const paneBAfter = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-b' });
assert.equal(paneAAfter.bars.length, 4);
assert.equal(paneBAfter.bars.length, 3);
assert.deepEqual(fetchCalls.map((call) => call.historyRequest || call.direction), [
  'backward',
  'backward',
  'backward',
]);

await registry.stop();

console.log('v6 multi-pane replay append step 156 smoke passed');
