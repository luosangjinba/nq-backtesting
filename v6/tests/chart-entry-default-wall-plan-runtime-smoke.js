import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
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
import { createChartEntryDefaultWallPlanRuntime } from '../src/chart-entry/chart-entry-default-wall-plan-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
const plannedEvents = [];
const forbiddenCalls = [];
const unsubscribePlanned = subscribeEvent(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, (payload) => {
  plannedEvents.push(payload);
});

registry.registerRuntime(createChartEntryDefaultWallPlanRuntime());
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

assert.equal(hasCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED), 1);
assert.equal(listenerCount(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE), {
  error: null,
  plan: null,
  status: 'idle',
});

emitEvent(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED, {
  context: {
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
      key: 'NQ|1|2026-06-01 07:30|2026-06-01 09:30',
    },
    sessionId: 'session-wall',
  },
  replayState: {
    cursorIndex: 0,
    cursorTime: '2026-06-01T09:30:00.000Z',
    sessionId: 'session-wall',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
  },
  sessionId: 'session-wall',
});

const state = await dispatchCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE);
assert.equal(state.status, 'planned');
assert.equal(state.error, null);
assert.equal(state.plan.sessionId, 'session-wall');
assert.equal(state.plan.paneId, 'main');
assert.equal(state.plan.prefixBars, 120);
assert.equal(state.plan.spanBars, 80);
assert.equal(state.plan.latestOffsetBars, 12);
assert.equal(state.plan.context.record.barCount, 121);
assert.equal('bars' in state.plan.context.record, false);
assert.equal(plannedEvents.length, 1);
assert.equal(plannedEvents[0].sessionId, 'session-wall');
assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribePlanned();
assert.equal(hasCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED), 0);
assert.equal(listenerCount(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED), 0);

clearCommandsForTest();
clearEventsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryDefaultWallPlanRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(DEFAULT_WALL_COMMANDS.LOAD, () => {
  forbiddenCalls.push({ command: DEFAULT_WALL_COMMANDS.LOAD });
});
emitEvent(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED, {
  context: null,
  replayState: {
    cursorIndex: 0,
    cursorTime: '2026-06-01T09:30:00.000Z',
    sessionId: 'session-wall',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
  },
  sessionId: 'session-wall',
});
assert.deepEqual(await dispatchCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE), {
  error: 'Chart entry default wall context is required.',
  plan: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry default wall plan runtime smoke passed');
