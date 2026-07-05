import { PERSISTENCE_COMMANDS, PERSISTENCE_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createPersistenceRepository } from './persistence-repository.js';

export function createPersistenceRuntime({
  repository = createPersistenceRepository(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PERSISTENCE_COMMANDS.SAVE_RECORD, (payload = {}) => {
        const record = repository.save(payload);
        emit(PERSISTENCE_EVENTS.SAVED, record);
        return record;
      }),
      registerCommand(PERSISTENCE_COMMANDS.GET_RECORD, ({ collection, key } = {}) => repository.get(collection, key)),
      registerCommand(PERSISTENCE_COMMANDS.LIST_RECORDS, ({ collection = null } = {}) => repository.list(collection)),
      registerCommand(PERSISTENCE_COMMANDS.DELETE_RECORD, ({ collection, key } = {}) => {
        const deleted = repository.remove(collection, key);
        emit(PERSISTENCE_EVENTS.DELETED, { collection, deleted, key });
        return deleted;
      }),
      registerCommand(PERSISTENCE_COMMANDS.CLEAR, () => {
        repository.clear();
        emit(PERSISTENCE_EVENTS.CLEARED, {});
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.persistence',
    start,
    stop,
  };
}
