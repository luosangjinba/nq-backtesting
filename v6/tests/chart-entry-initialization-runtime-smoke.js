import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_INITIALIZATION_COMMANDS,
  CHART_ENTRY_INITIALIZATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
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
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { resetSessionIdsForTest } from '../src/session/session-domain.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';
import { createChartEntryRuntime } from '../src/chart-entry/chart-entry-runtime.js';
import { createChartEntryInitializationRuntime } from '../src/chart-entry/chart-entry-initialization-runtime.js';

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const registry = createRuntimeRegistry();
const plannedEvents = [];
const forbiddenCalls = [];
const unsubscribePlanned = subscribeEvent(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED, (payload) => {
  plannedEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createBarDataRuntime());
registry.registerRuntime(createChartEntryRuntime());
registry.registerRuntime(createChartEntryInitializationRuntime());
await registry.start({ emitEvent, subscribeEvent });
[
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
].forEach((command) => {
  registerCommand(command, (payload) => {
    forbiddenCalls.push({ command, payload });
  });
});

assert.equal(hasCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE), {
  error: null,
  plan: null,
  status: 'idle',
});

const session = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
});
await new Promise((resolve) => setTimeout(resolve, 0));

const state = await dispatchCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE);
assert.equal(state.status, 'planned');
assert.equal(state.error, null);
assert.equal(state.plan.sessionId, session.id);
assert.equal(state.plan.startBarAnchor, '2026-06-01T09:30:00.000Z');
assert.deepEqual(state.plan.boundedContextWindow, {
  anchor: '2026-06-01T09:30:00.000Z',
  count: 121,
  direction: 'backward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(state.plan.plannedWindow.bounded, true);
assert.equal(state.plan.plannedWindow.direction, 'backward');
assert.equal(state.plan.plannedWindow.estimatedBars, 121);
assert.equal(plannedEvents.length, 1);
assert.equal(plannedEvents[0].sessionId, session.id);

assert.equal(forbiddenCalls.length, 0);

await registry.stop();
unsubscribePlanned();
assert.equal(hasCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE), false);
assert.equal(listenerCount(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED), 0);

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createSessionRuntime());
failingRegistry.registerRuntime(createChartEntryRuntime());
failingRegistry.registerRuntime(createChartEntryInitializationRuntime());
await failingRegistry.start({ emitEvent, subscribeEvent });
registerCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, () => {
  throw new Error('plan window unavailable');
});
await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-05T16:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(await dispatchCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE), {
  error: 'plan window unavailable',
  plan: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry initialization runtime smoke passed');
