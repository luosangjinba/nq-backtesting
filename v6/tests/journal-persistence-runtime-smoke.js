import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  JOURNAL_COMMANDS,
  JOURNAL_PERSISTENCE_COMMANDS,
  JOURNAL_PERSISTENCE_EVENTS,
  PERSISTENCE_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createJournalPersistenceRuntime } from '../src/journal-persistence/journal-persistence-runtime.js';
import { createJournalRuntime } from '../src/journal/journal-runtime.js';
import { createPersistenceRuntime } from '../src/persistence/persistence-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const forbiddenMutations = [];
const unregisterForbidden = [
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_DATA_COMMANDS.APPEND_BARS,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.RESET,
].map((command) => registerCommand(command, (payload) => {
  forbiddenMutations.push({ command, payload });
}));

const savedEvents = [];
const loadedEvents = [];
const deletedEvents = [];
const unsubscribeSaved = subscribeEvent(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_SAVED, (payload) => savedEvents.push(payload));
const unsubscribeLoaded = subscribeEvent(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_LOADED, (payload) => loadedEvents.push(payload));
const unsubscribeDeleted = subscribeEvent(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_DELETED, (payload) => deletedEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createPersistenceRuntime());
registry.registerRuntime(createJournalRuntime());
registry.registerRuntime(createJournalPersistenceRuntime({
  now: () => '2026-07-05T12:00:00.000Z',
}));
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT), true);
assert.equal(hasCommand(JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT), true);

await dispatchCommand(JOURNAL_COMMANDS.ADD_ENTRY, {
  id: 'entry-a',
  symbol: 'NQ',
  side: 'buy',
  quantity: 1,
  entryPrice: 100,
  exitPrice: 101,
  openedAt: '2026-07-05T09:30:00.000Z',
  closedAt: '2026-07-05T09:31:00.000Z',
});

const saved = await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT, {
  key: 'morning',
});
assert.equal(saved.key, 'morning');
assert.equal(saved.value.version, 1);
assert.equal(saved.value.savedAt, '2026-07-05T12:00:00.000Z');
assert.deepEqual(saved.value.entries.map((entry) => entry.id), ['entry-a']);
assert.deepEqual(savedEvents, [saved]);

const persisted = await dispatchCommand(PERSISTENCE_COMMANDS.GET_RECORD, {
  collection: 'journalSnapshots',
  key: 'morning',
});
assert.equal(persisted.value.entries[0].id, 'entry-a');

await dispatchCommand(JOURNAL_COMMANDS.REPLACE_ENTRIES, {
  entries: [{
    id: 'entry-b',
    symbol: 'ES',
    side: 'sell',
    quantity: 2,
    entryPrice: 4100,
    openedAt: '2026-07-05T10:00:00.000Z',
  }],
});
assert.deepEqual((await dispatchCommand(JOURNAL_COMMANDS.LIST_ENTRIES)).map((entry) => entry.id), ['entry-b']);

const loaded = await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT, {
  key: 'morning',
});
assert.equal(loaded.key, 'morning');
assert.deepEqual(loaded.entries.map((entry) => entry.id), ['entry-a']);
assert.deepEqual((await dispatchCommand(JOURNAL_COMMANDS.LIST_ENTRIES)).map((entry) => entry.id), ['entry-a']);
assert.deepEqual(loadedEvents, [loaded]);
assert.deepEqual(forbiddenMutations, []);

assert.equal(await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT, {
  key: 'missing',
}), null);

assert.equal(await dispatchCommand(JOURNAL_PERSISTENCE_COMMANDS.DELETE_SNAPSHOT, {
  key: 'morning',
}), true);
assert.deepEqual(deletedEvents, [{
  deleted: true,
  key: 'morning',
}]);

await registry.stop();
assert.equal(hasCommand(JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT), false);
unsubscribeSaved();
unsubscribeLoaded();
unsubscribeDeleted();
unregisterForbidden.forEach((unregister) => unregister());

console.log('v6 journal persistence runtime smoke passed');
