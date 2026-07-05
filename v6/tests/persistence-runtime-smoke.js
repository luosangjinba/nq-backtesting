import assert from 'node:assert/strict';
import {
  PERSISTENCE_COMMANDS,
  PERSISTENCE_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createPersistenceRuntime } from '../src/persistence/persistence-runtime.js';
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

clearCommandsForTest();
clearEventsForTest();

const savedEvents = [];
const deletedEvents = [];
const clearedEvents = [];
const unsubscribeSaved = subscribeEvent(PERSISTENCE_EVENTS.SAVED, (payload) => savedEvents.push(payload));
const unsubscribeDeleted = subscribeEvent(PERSISTENCE_EVENTS.DELETED, (payload) => deletedEvents.push(payload));
const unsubscribeCleared = subscribeEvent(PERSISTENCE_EVENTS.CLEARED, (payload) => clearedEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createPersistenceRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(PERSISTENCE_COMMANDS.SAVE_RECORD), true);
assert.equal(listenerCount('replay:advanced'), 0);
assert.equal(listenerCount('chartData:barsChanged'), 0);
assert.equal(listenerCount('chartViewport:projected'), 0);

const saved = await dispatchCommand(PERSISTENCE_COMMANDS.SAVE_RECORD, {
  collection: 'recentSessions',
  key: 'session-a',
  value: {
    sessionId: 'session-a',
    symbol: 'NQ',
  },
});
assert.equal(saved.collection, 'recentSessions');
assert.equal(saved.key, 'session-a');
assert.equal(savedEvents.length, 1);
assert.deepEqual(
  await dispatchCommand(PERSISTENCE_COMMANDS.GET_RECORD, {
    collection: 'recentSessions',
    key: 'session-a',
  }),
  saved,
);
assert.deepEqual((await dispatchCommand(PERSISTENCE_COMMANDS.LIST_RECORDS)).map((record) => record.key), ['session-a']);
assert.equal(await dispatchCommand(PERSISTENCE_COMMANDS.DELETE_RECORD, {
  collection: 'recentSessions',
  key: 'session-a',
}), true);
assert.deepEqual(deletedEvents, [{
  collection: 'recentSessions',
  deleted: true,
  key: 'session-a',
}]);
await dispatchCommand(PERSISTENCE_COMMANDS.CLEAR);
assert.deepEqual(clearedEvents, [{}]);

await registry.stop();
assert.equal(hasCommand(PERSISTENCE_COMMANDS.SAVE_RECORD), false);
unsubscribeSaved();
unsubscribeDeleted();
unsubscribeCleared();

console.log('v6 persistence runtime smoke passed');
