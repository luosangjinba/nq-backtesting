import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_COMMANDS,
  CHART_ENTRY_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { resetSessionIdsForTest } from '../src/session/session-domain.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';
import { createChartEntryRuntime } from '../src/chart-entry/chart-entry-runtime.js';

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const registry = createRuntimeRegistry();
const activatedEvents = [];
const unsubscribeActivated = subscribeEvent(CHART_ENTRY_EVENTS.ACTIVATED, (payload) => {
  activatedEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createChartEntryRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(CHART_ENTRY_COMMANDS.GET_STATE), true);
assert.equal(listenerCount(CHART_ENTRY_EVENTS.ACTIVATED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE), {
  activation: null,
  activeSessionId: null,
  initializationPlan: null,
  status: 'idle',
});

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-01T10:00:00.000Z',
  startTime: '2026-06-01T09:30:00.000Z',
});
const afterCreate = await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE);
assert.equal(afterCreate.activeSessionId, created.id);
assert.equal(afterCreate.status, 'planned');
assert.equal(afterCreate.activation.sessionId, created.id);
assert.equal(afterCreate.activation.source, 'session.created');
assert.equal(afterCreate.initializationPlan.sessionId, created.id);
assert.equal(afterCreate.initializationPlan.source, 'session.created');
assert.deepEqual(afterCreate.initializationPlan.steps, [
  'resolve-start-bar',
  'load-bounded-replay-context',
  'load-replay-state',
  'project-default-wall',
  'apply-chart-data-and-viewport',
]);
assert.equal(activatedEvents.length, 1);
assert.equal(activatedEvents[0].sessionId, created.id);

const second = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  endTime: '2026-06-02T10:00:00.000Z',
  startTime: '2026-06-02T09:30:00.000Z',
});
await dispatchCommand(SESSION_COMMANDS.OPEN, created.id);
const afterOpen = await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE);
assert.equal(second.id, 'v6-session-0002');
assert.equal(afterOpen.activeSessionId, created.id);
assert.equal(afterOpen.activation.source, 'session.opened');
assert.equal(afterOpen.initializationPlan.sessionId, created.id);
assert.equal(afterOpen.initializationPlan.source, 'session.opened');
assert.equal(activatedEvents.length, 3);

await assert.rejects(
  () => dispatchCommand(SESSION_COMMANDS.OPEN, 'missing-session'),
  /Session missing-session does not exist/
);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE), afterOpen);

[
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
].forEach((command) => {
  assert.equal(hasCommand(command), false);
});

await registry.stop();
assert.equal(hasCommand(CHART_ENTRY_COMMANDS.GET_STATE), false);
unsubscribeActivated();
assert.equal(listenerCount(CHART_ENTRY_EVENTS.ACTIVATED), 0);

console.log('v6 chart entry runtime smoke passed');
