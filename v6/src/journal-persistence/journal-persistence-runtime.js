import {
  JOURNAL_COMMANDS,
  JOURNAL_PERSISTENCE_COMMANDS,
  JOURNAL_PERSISTENCE_EVENTS,
  PERSISTENCE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  createJournalSnapshotValue,
  journalSnapshotPersistenceKey,
  normalizeJournalSnapshotRecord,
} from './journal-snapshot.js';

const JOURNAL_SNAPSHOT_COLLECTION = 'journalSnapshots';

export function createJournalPersistenceRuntime({
  now = () => new Date().toISOString(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(JOURNAL_PERSISTENCE_COMMANDS.SAVE_SNAPSHOT, async ({ key = 'default' } = {}) => {
        const entries = await dispatchCommand(JOURNAL_COMMANDS.LIST_ENTRIES);
        const savedRecord = await dispatchCommand(PERSISTENCE_COMMANDS.SAVE_RECORD, {
          collection: JOURNAL_SNAPSHOT_COLLECTION,
          key: journalSnapshotPersistenceKey(key),
          value: createJournalSnapshotValue({ entries }, { now }),
        });
        const snapshot = normalizeJournalSnapshotRecord(savedRecord);
        emit(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_SAVED, snapshot);
        return snapshot;
      }),
      registerCommand(JOURNAL_PERSISTENCE_COMMANDS.LOAD_SNAPSHOT, async ({ key = 'default' } = {}) => {
        const record = await dispatchCommand(PERSISTENCE_COMMANDS.GET_RECORD, {
          collection: JOURNAL_SNAPSHOT_COLLECTION,
          key: journalSnapshotPersistenceKey(key),
        });
        const snapshot = normalizeJournalSnapshotRecord(record);
        if (!snapshot) return null;
        const entries = await dispatchCommand(JOURNAL_COMMANDS.REPLACE_ENTRIES, {
          entries: snapshot.value.entries,
        });
        const loaded = {
          ...snapshot,
          entries,
        };
        emit(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_LOADED, loaded);
        return loaded;
      }),
      registerCommand(JOURNAL_PERSISTENCE_COMMANDS.DELETE_SNAPSHOT, async ({ key = 'default' } = {}) => {
        const snapshotKey = journalSnapshotPersistenceKey(key);
        const deleted = await dispatchCommand(PERSISTENCE_COMMANDS.DELETE_RECORD, {
          collection: JOURNAL_SNAPSHOT_COLLECTION,
          key: snapshotKey,
        });
        const payload = { deleted, key: snapshotKey };
        emit(JOURNAL_PERSISTENCE_EVENTS.SNAPSHOT_DELETED, payload);
        return deleted;
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.journalPersistence',
    start,
    stop,
  };
}
