import assert from 'node:assert/strict';
import {
  CHART_ENTRY_RESTART_COMMANDS,
  CHART_ENTRY_RESTART_EVENTS,
  SESSION_COMMANDS,
  SESSION_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createChartEntryRestartRuntime } from '../src/chart-entry/chart-entry-restart-runtime.js';
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

clearCommandsForTest();
clearEventsForTest();

const openedEvents = [];
const restartedEvents = [];
const unsubscribeOpened = subscribeEvent(SESSION_EVENTS.OPENED, (payload) => {
  openedEvents.push(payload);
});
const unsubscribeRestarted = subscribeEvent(CHART_ENTRY_RESTART_EVENTS.RESTARTED, (payload) => {
  restartedEvents.push(payload);
});

const session = Object.freeze({
  endTime: '2026-06-01T09:34:00.000Z',
  id: 'session-restart',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
});
const calls = [];

registerCommand(SESSION_COMMANDS.GET_ACTIVE, () => {
  calls.push(SESSION_COMMANDS.GET_ACTIVE);
  return session;
});
registerCommand(SESSION_COMMANDS.OPEN, (sessionId) => {
  calls.push(SESSION_COMMANDS.OPEN);
  assert.equal(sessionId, session.id);
  emitEvent(SESSION_EVENTS.OPENED, session);
  return session;
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartEntryRestartRuntime());
await registry.start({ emitEvent });

assert.equal(hasCommand(CHART_ENTRY_RESTART_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART), true);
assert.equal(listenerCount(CHART_ENTRY_RESTART_EVENTS.RESTARTED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.GET_STATE), {
  error: null,
  restarted: null,
  status: 'idle',
});

const restarted = await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART);
assert.equal(restarted.status, 'restarted');
assert.equal(restarted.error, null);
assert.equal(restarted.restarted.sessionId, session.id);
assert.deepEqual(restarted.restarted.session, session);
assert.deepEqual(calls, [
  SESSION_COMMANDS.GET_ACTIVE,
  SESSION_COMMANDS.OPEN,
]);
assert.deepEqual(openedEvents, [session]);
assert.equal(restartedEvents.length, 1);
assert.equal(restartedEvents[0].sessionId, session.id);

await registry.stop();
assert.equal(hasCommand(CHART_ENTRY_RESTART_COMMANDS.GET_STATE), false);
assert.equal(hasCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART), false);
unsubscribeOpened();
unsubscribeRestarted();

clearCommandsForTest();
clearEventsForTest();

registerCommand(SESSION_COMMANDS.GET_ACTIVE, () => null);
const failingRegistry = createRuntimeRegistry();
failingRegistry.registerRuntime(createChartEntryRestartRuntime());
await failingRegistry.start({ emitEvent });
assert.deepEqual(await dispatchCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART), {
  error: 'Chart entry restart requires an active session.',
  restarted: null,
  status: 'error',
});
await failingRegistry.stop();

console.log('v6 chart entry restart runtime smoke passed');
