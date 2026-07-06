import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_CONTEXT_COMMANDS,
  CHART_ENTRY_CONTEXT_EVENTS,
  CHART_ENTRY_INITIALIZATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
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
import { createChartEntryContextRuntime } from '../src/chart-entry/chart-entry-context-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
const loadedEvents = [];
const forbiddenCalls = [];
const loadCalls = [];
const unsubscribeLoaded = subscribeEvent(CHART_ENTRY_CONTEXT_EVENTS.LOADED, (payload) => {
  loadedEvents.push(payload);
});

registry.registerRuntime(createChartEntryContextRuntime());
await registry.start({ emitEvent, subscribeEvent });
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, async (payload) => {
  loadCalls.push(payload);
  return {
    ...payload,
    bars: [
      { close: 1, high: 2, low: 0, open: 1, timestamp: 1780306200 },
      { close: 2, high: 3, low: 1, open: 1, timestamp: 1780306260 },
    ],
    cacheHit: false,
    coveredByKey: null,
    key: 'NQ|1|2026-06-01 07:30|2026-06-01 09:30',
    requestedRange: { endTs: 1780306200, startTs: 1780299000 },
    timing: { elapsedMs: 4 },
  };
});
[
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED), 1);
assert.equal(listenerCount(CHART_ENTRY_CONTEXT_EVENTS.LOADED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE), {
  error: null,
  loaded: null,
  status: 'idle',
});

const plannedWindow = {
  anchor: '2026-06-01T09:30:00.000Z',
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:30',
  estimatedBars: 121,
  instrument: 'NQ',
  start: '2026-06-01 07:30',
  timeframe: 1,
};
emitEvent(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED, {
  plannedWindow,
  sessionId: 'session-test',
  startBarAnchor: '2026-06-01T09:30:00.000Z',
});
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE);
assert.equal(state.status, 'loaded');
assert.equal(state.error, null);
assert.equal(state.loaded.sessionId, 'session-test');
assert.equal(state.loaded.anchor, '2026-06-01T09:30:00.000Z');
assert.deepEqual(state.loaded.plannedWindow, plannedWindow);
assert.equal(state.loaded.record.barCount, 2);
assert.equal(state.loaded.record.cacheHit, false);
assert.equal(state.loaded.record.key, 'NQ|1|2026-06-01 07:30|2026-06-01 09:30');
assert.equal('bars' in state.loaded.record, false);
assert.equal('bars' in state.loaded.loadedWindow, false);
assert.equal(state.loaded.loadedWindow.start, plannedWindow.start);
assert.equal(state.loaded.loadedWindow.end, plannedWindow.end);
assert.equal(loadCalls.length, 1);
assert.deepEqual(loadCalls[0], plannedWindow);
assert.equal(loadedEvents.length, 1);
assert.equal(loadedEvents[0].record.barCount, 2);
assert.equal('bars' in loadedEvents[0].record, false);
assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribeLoaded();
assert.equal(hasCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED), 0);
assert.equal(listenerCount(CHART_ENTRY_CONTEXT_EVENTS.LOADED), 0);

clearCommandsForTest();
clearEventsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryContextRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, () => {
  throw new Error('load window unavailable');
});
emitEvent(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED, {
  plannedWindow,
  sessionId: 'session-failing',
  startBarAnchor: '2026-06-01T09:30:00.000Z',
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(await dispatchCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE), {
  error: 'load window unavailable',
  loaded: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry context runtime smoke passed');
