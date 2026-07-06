import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_ENTRY_CONTEXT_EVENTS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
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
import { createChartEntryReplayBootstrapRuntime } from '../src/chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { resetSessionIdsForTest } from '../src/session/session-domain.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const registry = createRuntimeRegistry();
const loadedEvents = [];
const forbiddenCalls = [];
const unsubscribeLoaded = subscribeEvent(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED, (payload) => {
  loadedEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createChartEntryReplayBootstrapRuntime());
await registry.start({ emitEvent, subscribeEvent });
[
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  DEFAULT_WALL_COMMANDS.LOAD,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_CONTEXT_EVENTS.LOADED), 1);
assert.equal(listenerCount(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE), {
  error: null,
  loaded: null,
  status: 'idle',
});

const session = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-01T09:32:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
});
const context = {
  anchor: '2026-06-01T09:30:00.000Z',
  loadedWindow: {
    bounded: true,
    end: '2026-06-01 09:30',
    estimatedBars: 121,
    instrument: 'NQ',
    start: '2026-06-01 07:30',
    timeframe: 1,
  },
  plannedWindow: {
    bounded: true,
    end: '2026-06-01 09:30',
    estimatedBars: 121,
    instrument: 'NQ',
    start: '2026-06-01 07:30',
    timeframe: 1,
  },
  record: {
    barCount: 121,
    cacheHit: false,
    coveredByKey: null,
    key: 'NQ|1|2026-06-01 07:30|2026-06-01 09:30',
    requestedRange: null,
    timing: null,
  },
  sessionId: session.id,
};
emitEvent(CHART_ENTRY_CONTEXT_EVENTS.LOADED, context);
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE);
const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(state.status, 'loaded');
assert.equal(state.error, null);
assert.equal(state.loaded.sessionId, session.id);
assert.deepEqual(state.loaded.context, context);
assert.equal(state.loaded.replayState.sessionId, session.id);
assert.equal(state.loaded.replayState.cursorTime, '2026-06-01T09:30:00.000Z');
assert.equal(state.loaded.replayState.revealedCount, 1);
assert.equal(state.loaded.replayState.totalBars, 3);
assert.deepEqual(replayState, state.loaded.replayState);
assert.equal(loadedEvents.length, 1);
assert.equal(loadedEvents[0].sessionId, session.id);
assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribeLoaded();
assert.equal(hasCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_CONTEXT_EVENTS.LOADED), 0);
assert.equal(listenerCount(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED), 0);

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryReplayBootstrapRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(SESSION_COMMANDS.GET_BY_ID, () => null);
emitEvent(CHART_ENTRY_CONTEXT_EVENTS.LOADED, {
  ...context,
  sessionId: 'missing-session',
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(await dispatchCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE), {
  error: 'Chart entry replay bootstrap session missing-session does not exist.',
  loaded: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry replay bootstrap runtime smoke passed');
