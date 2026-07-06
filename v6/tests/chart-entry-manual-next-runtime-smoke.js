import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
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
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const calls = [];
const forbiddenCalls = [];
const advancedEvents = [];
const unsubscribeAdvanced = subscribeEvent(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED, (payload) => {
  advancedEvents.push(payload);
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent });

registerCommand(REPLAY_COMMANDS.NEXT, () => {
  calls.push({ command: REPLAY_COMMANDS.NEXT });
  return {
    cursorIndex: 1,
    cursorTime: '2026-06-01T09:31:00.000Z',
    revealedCount: 2,
    sessionId: 'session-next',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
  };
});
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
  calls.push({ command: BAR_DATA_COMMANDS.LOAD_WINDOW, payload });
  return {
    bars: [
      { close: 101, high: 102, low: 100, open: 100, timestamp: 1780306260 },
    ],
    cacheHit: false,
    key: 'NQ|1|2026-06-01 09:31|2026-06-01 09:31',
  };
});
registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload) => {
  calls.push({ command: CHART_DATA_COMMANDS.APPEND_BARS, payload });
  return {
    bars: payload.bars.map((bar) => ({ ...bar })),
    cursorTimestamp: payload.cursorTimestamp,
    paneId: payload.paneId,
    revision: 2,
  };
});
[
  DEFAULT_WALL_COMMANDS.NEXT,
  DEFAULT_WALL_COMMANDS.LOAD,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT), true);
assert.equal(listenerCount(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE), {
  advanced: null,
  error: null,
  status: 'idle',
});

const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
assert.equal(state.status, 'advanced');
assert.equal(state.error, null);
assert.equal(state.advanced.sessionId, 'session-next');
assert.equal(state.advanced.chartRecord.revision, 2);
assert.equal(state.advanced.chartRecord.bars.length, 1);
assert.equal(state.advanced.loadedWindow.barCount, 1);
assert.equal(advancedEvents.length, 1);
assert.deepEqual(calls.map((call) => call.command), [
  REPLAY_COMMANDS.NEXT,
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.APPEND_BARS,
]);
assert.deepEqual(calls[1].payload, {
  anchor: '2026-06-01T09:31:00.000Z',
  count: 1,
  direction: 'forward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(calls[2].payload.paneId, 'main');
assert.equal(calls[2].payload.cursorTimestamp, 1780306260);
assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribeAdvanced();
assert.equal(hasCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE), false);
assert.equal(hasCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT), false);
assert.equal(listenerCount(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED), 0);

clearCommandsForTest();
clearEventsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryManualNextRuntime());
await failingRegistry.start({ emitEvent });
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  throw new Error('replay unavailable');
});
assert.deepEqual(await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT), {
  advanced: null,
  error: 'replay unavailable',
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry manual next runtime smoke passed');
