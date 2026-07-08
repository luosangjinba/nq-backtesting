import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createChartEntryProjectionPreparationRuntime } from '../src/chart-entry/chart-entry-projection-preparation-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const bars = Array.from({ length: 5 }, (_, index) => ({
  close: 100 + index,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));
const window = {
  bounded: true,
  end: '2026-06-01 09:30',
  estimatedBars: 5,
  instrument: 'NQ',
  start: '2026-06-01 09:26',
  timeframe: 1,
};
const plan = {
  anchor: '2026-06-01T09:30:00.000Z',
  context: {
    loadedWindow: window,
    plannedWindow: window,
    record: {
      barCount: 5,
      cacheHit: false,
      key: 'NQ|1|2026-06-01 09:26|2026-06-01 09:30',
    },
  },
  cursorTime: '2026-06-01T09:30:00.000Z',
  latestOffsetBars: 12,
  paneId: 'main',
  prefixBars: 120,
  sessionId: 'session-prep',
  spanBars: 80,
};

const registry = createRuntimeRegistry();
const preparedEvents = [];
const forbiddenCalls = [];
const getWindowCalls = [];
const unsubscribePrepared = subscribeEvent(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, (payload) => {
  preparedEvents.push(payload);
});

registry.registerRuntime(createChartEntryProjectionPreparationRuntime());
await registry.start({ emitEvent, subscribeEvent });
registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, (payload) => {
  getWindowCalls.push(payload);
  return {
    ...window,
    bars,
    cacheHit: true,
    key: 'NQ|1|2026-06-01 09:26|2026-06-01 09:30',
  };
});
[
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  DEFAULT_WALL_COMMANDS.LOAD,
  REPLAY_COMMANDS.NEXT,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED), 1);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE), {
  error: null,
  prepared: null,
  status: 'idle',
});

emitEvent(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, plan);
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE);
assert.equal(state.status, 'prepared');
assert.equal(state.error, null);
assert.equal(state.prepared.sessionId, 'session-prep');
assert.equal(state.prepared.chartReplacePayload.bars.length, 1);
assert.equal(state.prepared.chartReplacePayload.cursorTimestamp, bars[0].timestamp);
assert.equal(state.prepared.viewportIntentPayload.cursorTimestamp, bars[0].timestamp);
assert.equal(state.prepared.viewportIntentPayload.spanBars, 80);
assert.equal(state.prepared.source.barCount, 5);
assert.equal('bars' in state.prepared.source, false);
assert.equal('bars' in state.prepared.source.window, false);
assert.equal(getWindowCalls.length, 1);
assert.deepEqual(getWindowCalls[0], window);
assert.equal(preparedEvents.length, 1);
assert.equal(preparedEvents[0].chartReplacePayload.bars.length, 1);
assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribePrepared();
assert.equal(hasCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED), 0);
assert.equal(listenerCount(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED), 0);

clearCommandsForTest();
clearEventsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryProjectionPreparationRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(BAR_DATA_COMMANDS.GET_WINDOW, () => null);
emitEvent(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, plan);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(await dispatchCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE), {
  error: 'Chart entry projection preparation cache window is missing.',
  prepared: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry projection preparation runtime smoke passed');
