import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  CHART_VIEWPORT_EVENTS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
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
    sessionId: 'multi-pane-viewport',
    status,
    symbol: 'NQ',
    timeframe: '1m',
  };
}

function initialBars(offset = 0) {
  return [
    { close: 101 + offset, high: 102 + offset, low: 100 + offset, open: 100 + offset, timestamp: 1780306260 },
  ];
}

function projectionOf(record) {
  return { ...record.projection };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const fetchCalls = [];
const projectedEvents = [];
function timestampFromWindowTime(value) {
  const text = String(value || '');
  const iso = text.includes('T') ? text : `${text.replace(' ', 'T')}:00.000Z`;
  return Math.floor(new Date(iso).valueOf() / 1000);
}
const unsubscribeProjected = subscribeEvent(CHART_VIEWPORT_EVENTS.PROJECTED, (record) => {
  projectedEvents.push(record);
});
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
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 1;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState(cursorIndex));
registerCommand(REPLAY_COMMANDS.PLAY, () => replayState(cursorIndex, 'playing'));
registerCommand(REPLAY_COMMANDS.PAUSE, () => replayState(cursorIndex, 'paused'));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  const state = replayState(cursorIndex, cursorIndex >= 4 ? 'ended' : 'playing');
  emitEvent(REPLAY_EVENTS.ADVANCED, state);
  return state;
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({
  period: '1m',
  sync: false,
}));

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306260,
  latestOffsetBars: 8,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306260,
  latestOffsetBars: 12,
  paneId: 'pane-b',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(0),
  cursorTimestamp: 1780306260,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(100),
  cursorTimestamp: 1780306260,
  paneId: 'pane-b',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 6,
  paneId: 'pane-b',
  spanBars: 40,
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
  chartBarsRevision: 1,
  latestLogicalIndex: 0,
  paneId: 'pane-b',
});

const beforeA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
const beforeB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });

const nextA = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-a' });
assert.equal(nextA.status, 'advanced');
assert.equal(nextA.advanced.chartRecord.paneId, 'pane-a');

const afterManualA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
const afterManualB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
assert.equal(afterManualA.chartBarsRevision, nextA.advanced.chartRecord.revision);
assert.deepEqual(projectionOf(afterManualA), {
  from: -111,
  latestLogicalIndex: 1,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 9,
});
assert.deepEqual(projectionOf(afterManualB), projectionOf(beforeB));
assert.equal(afterManualB.intent.origin, 'manual');
assert.equal(afterManualB.intent.latestOffsetBars, beforeB.intent.latestOffsetBars);
assert.equal(afterManualB.intent.spanBars, beforeB.intent.spanBars);
assert.equal(afterManualB.intent.revision, beforeB.intent.revision);

const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
  paneId: 'pane-b',
  speed: 4,
});
assert.equal(started.paneId, 'pane-b');
await fakeTimer.tick();
await fakeTimer.tick();

const afterAutoA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
const afterAutoB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
assert.deepEqual(projectionOf(afterAutoA), projectionOf(afterManualA));
assert.equal(afterAutoB.intent.origin, 'manual');
assert.equal(afterAutoB.intent.latestOffsetBars, beforeB.intent.latestOffsetBars);
assert.equal(afterAutoB.intent.spanBars, beforeB.intent.spanBars);
assert.equal(afterAutoB.intent.revision, beforeB.intent.revision);
assert.deepEqual(projectionOf(afterAutoB), {
  from: -32,
  latestLogicalIndex: 2,
  latestOffsetBars: 6,
  origin: 'manual',
  revision: 1,
  spanBars: 40,
  to: 8,
});
assert.deepEqual(projectedEvents.map((record) => record.paneId), [
  'pane-a',
  'pane-b',
  'pane-b',
  'pane-a',
  'pane-b',
  'pane-b',
]);
assert.deepEqual(fetchCalls.map((call) => call.historyRequest || call.direction), [
  'backward',
  'backward',
  'backward',
]);

await registry.stop();
unsubscribeProjected();

console.log('v6 multi-pane replay viewport projection step 157 smoke passed');
