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
const unsubscribeCreated = subscribeEvent(SESSION_EVENTS.CREATED, (payload) => {
  createdEvents.push(payload);
});

registry.registerRuntime(createSessionRuntime());
await registry.start({ emitEvent });

assert.equal(hasCommand(SESSION_COMMANDS.CREATE), true);
assert.equal(hasCommand(SESSION_COMMANDS.GET_ACTIVE), true);
assert.equal(hasCommand(SESSION_COMMANDS.GET_BY_ID), true);
assert.equal(hasCommand(SESSION_COMMANDS.LIST), true);
assert.equal(listenerCount(SESSION_EVENTS.CREATED), 1);

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

await registry.stop();
assert.equal(hasCommand(SESSION_COMMANDS.CREATE), false);
unsubscribeCreated();
assert.equal(listenerCount(SESSION_EVENTS.CREATED), 0);

console.log('v6 session runtime smoke passed');
