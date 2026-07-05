import assert from 'node:assert/strict';
import {
  JOURNAL_COMMANDS,
  JOURNAL_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createJournalRuntime } from '../src/journal/journal-runtime.js';
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

const addedEvents = [];
const updatedEvents = [];
const deletedEvents = [];
const replacedEvents = [];
const unsubscribeAdded = subscribeEvent(JOURNAL_EVENTS.ENTRY_ADDED, (payload) => addedEvents.push(payload));
const unsubscribeUpdated = subscribeEvent(JOURNAL_EVENTS.ENTRY_UPDATED, (payload) => updatedEvents.push(payload));
const unsubscribeDeleted = subscribeEvent(JOURNAL_EVENTS.ENTRY_DELETED, (payload) => deletedEvents.push(payload));
const unsubscribeReplaced = subscribeEvent(JOURNAL_EVENTS.ENTRY_REPLACED, (payload) => replacedEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createJournalRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(JOURNAL_COMMANDS.ADD_ENTRY), true);
assert.equal(listenerCount('replay:advanced'), 0);
assert.equal(listenerCount('chartData:barsChanged'), 0);
assert.equal(listenerCount('chartViewport:projected'), 0);

const added = await dispatchCommand(JOURNAL_COMMANDS.ADD_ENTRY, {
  id: 'entry-a',
  symbol: 'nq',
  side: 'buy',
  quantity: 2,
  entryPrice: 100,
  openedAt: '2026-07-05T09:30:00.000Z',
});
assert.equal(added.symbol, 'NQ');
assert.deepEqual(addedEvents, [added]);

const updated = await dispatchCommand(JOURNAL_COMMANDS.UPDATE_ENTRY, {
  id: 'entry-a',
  patch: {
    exitPrice: 101,
    closedAt: '2026-07-05T09:33:00.000Z',
  },
});
assert.equal(updated.exitPrice, 101);
assert.deepEqual(updatedEvents, [updated]);
assert.deepEqual(await dispatchCommand(JOURNAL_COMMANDS.GET_ENTRY, { id: 'entry-a' }), updated);
assert.deepEqual((await dispatchCommand(JOURNAL_COMMANDS.LIST_ENTRIES)).map((entry) => entry.id), ['entry-a']);

const summary = await dispatchCommand(JOURNAL_COMMANDS.ANALYZE_RECORDS, {
  records: [{
    id: 'supplied-only',
    symbol: 'ES',
    side: 'sell',
    quantity: 1,
    entryPrice: 4100,
    exitPrice: 4098,
    openedAt: '2026-07-05T10:00:00.000Z',
    closedAt: '2026-07-05T10:05:00.000Z',
  }],
});
assert.equal(summary.entryCount, 1);
assert.equal(summary.netPnl, 2);
assert.deepEqual(Object.keys(summary.bySymbol), ['ES']);

const replaced = await dispatchCommand(JOURNAL_COMMANDS.REPLACE_ENTRIES, {
  entries: [{
    id: 'entry-b',
    symbol: 'YM',
    side: 'buy',
    quantity: 1,
    entryPrice: 50,
    openedAt: '2026-07-05T10:30:00.000Z',
  }],
});
assert.deepEqual(replaced.map((entry) => entry.id), ['entry-b']);
assert.deepEqual(replacedEvents, [replaced]);

assert.equal(await dispatchCommand(JOURNAL_COMMANDS.DELETE_ENTRY, { id: 'entry-b' }), true);
assert.deepEqual(deletedEvents, [{
  deleted: true,
  id: 'entry-b',
}]);

await registry.stop();
assert.equal(hasCommand(JOURNAL_COMMANDS.ADD_ENTRY), false);
unsubscribeAdded();
unsubscribeUpdated();
unsubscribeDeleted();
unsubscribeReplaced();

console.log('v6 journal runtime smoke passed');
