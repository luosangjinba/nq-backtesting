import { JOURNAL_COMMANDS, JOURNAL_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { summarizeJournalEntries } from './journal-analytics.js';
import { createJournalStore } from './journal-store.js';

export function createJournalRuntime({
  store = createJournalStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(JOURNAL_COMMANDS.ADD_ENTRY, (payload = {}) => {
        const entry = store.addEntry(payload);
        emit(JOURNAL_EVENTS.ENTRY_ADDED, entry);
        return entry;
      }),
      registerCommand(JOURNAL_COMMANDS.UPDATE_ENTRY, ({ id, patch = {} } = {}) => {
        const entry = store.updateEntry(id, patch);
        emit(JOURNAL_EVENTS.ENTRY_UPDATED, entry);
        return entry;
      }),
      registerCommand(JOURNAL_COMMANDS.DELETE_ENTRY, ({ id } = {}) => {
        const deleted = store.removeEntry(id);
        emit(JOURNAL_EVENTS.ENTRY_DELETED, { deleted, id: String(id || '').trim() });
        return deleted;
      }),
      registerCommand(JOURNAL_COMMANDS.GET_ENTRY, ({ id } = {}) => store.getEntry(id)),
      registerCommand(JOURNAL_COMMANDS.LIST_ENTRIES, () => store.listEntries()),
      registerCommand(JOURNAL_COMMANDS.REPLACE_ENTRIES, ({ entries = [] } = {}) => {
        const nextEntries = store.replaceEntries(entries);
        emit(JOURNAL_EVENTS.ENTRY_REPLACED, nextEntries);
        return nextEntries;
      }),
      registerCommand(JOURNAL_COMMANDS.ANALYZE_RECORDS, ({ records = [] } = {}) => summarizeJournalEntries(records)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.journal',
    start,
    stop,
  };
}
