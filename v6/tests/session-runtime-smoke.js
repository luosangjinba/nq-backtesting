import assert from 'node:assert/strict';
import {
  SESSION_COMMANDS,
  SESSION_EVENTS,
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

clearCommandsForTest();
clearEventsForTest();
resetSessionIdsForTest();

const registry = createRuntimeRegistry();
const createdEvents = [];
const openedEvents = [];
const unsubscribeCreated = subscribeEvent(SESSION_EVENTS.CREATED, (payload) => {
  createdEvents.push(payload);
});
const unsubscribeOpened = subscribeEvent(SESSION_EVENTS.OPENED, (payload) => {
  openedEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
await registry.start({ emitEvent });

assert.equal(hasCommand(SESSION_COMMANDS.CREATE), true);
assert.equal(hasCommand(SESSION_COMMANDS.DELETE), true);
assert.equal(hasCommand(SESSION_COMMANDS.GET_ACTIVE), true);
assert.equal(hasCommand(SESSION_COMMANDS.GET_BY_ID), true);
assert.equal(hasCommand(SESSION_COMMANDS.LIST), true);
assert.equal(hasCommand(SESSION_COMMANDS.OPEN), true);
assert.equal(listenerCount(SESSION_EVENTS.CREATED), 1);
assert.equal(listenerCount(SESSION_EVENTS.OPENED), 1);

assert.equal(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), null);
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.LIST), []);

const session = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  createdAt: '2026-07-04T01:00:00.000Z',
  endTime: '2026-06-03T16:00:00-04:00',
  startTime: '2026-06-03T09:30:00-04:00',
});

assert.equal(session.id, 'v6-session-0001');
assert.equal(session.symbol, 'NQ');
assert.equal(session.timeframe, '1m');
assert.equal(session.status, 'created');
assert.equal(createdEvents.length, 1);
assert.deepEqual(createdEvents[0], session);

const active = await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE);
assert.deepEqual(active, session);
active.symbol = 'MUTATED';
assert.equal((await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE)).symbol, 'NQ');

assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_BY_ID, session.id), session);
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.LIST), [session]);

const secondSession = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  createdAt: '2026-07-04T01:01:00.000Z',
  endTime: '2026-06-04T16:00:00-04:00',
  startTime: '2026-06-04T09:30:00-04:00',
});
assert.equal(secondSession.id, 'v6-session-0002');
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), secondSession);

const opened = await dispatchCommand(SESSION_COMMANDS.OPEN, session.id);
assert.deepEqual(opened, session);
assert.equal(openedEvents.length, 1);
assert.deepEqual(openedEvents[0], session);
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), session);
opened.symbol = 'MUTATED';
assert.equal((await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE)).symbol, 'NQ');

await assert.rejects(
  () => dispatchCommand(SESSION_COMMANDS.OPEN, 'missing-session'),
  /Session missing-session does not exist/
);
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), session);

const deleteMissing = await dispatchCommand(SESSION_COMMANDS.DELETE, 'missing-session');
assert.deepEqual(deleteMissing, {
  activeSessionId: session.id,
  deleted: false,
  id: 'missing-session',
});
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), session);

const deletedInactive = await dispatchCommand(SESSION_COMMANDS.DELETE, secondSession.id);
assert.deepEqual(deletedInactive, {
  activeSessionId: session.id,
  deleted: true,
  id: secondSession.id,
});
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.LIST), [session]);
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), session);

const deletedActive = await dispatchCommand(SESSION_COMMANDS.DELETE, session.id);
assert.deepEqual(deletedActive, {
  activeSessionId: null,
  deleted: true,
  id: session.id,
});
assert.deepEqual(await dispatchCommand(SESSION_COMMANDS.LIST), []);
assert.equal(await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE), null);

await registry.stop();
assert.equal(hasCommand(SESSION_COMMANDS.CREATE), false);
assert.equal(hasCommand(SESSION_COMMANDS.OPEN), false);
unsubscribeCreated();
unsubscribeOpened();
assert.equal(listenerCount(SESSION_EVENTS.CREATED), 0);
assert.equal(listenerCount(SESSION_EVENTS.OPENED), 0);

console.log('v6 session runtime smoke passed');
