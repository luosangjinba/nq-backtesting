import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createPersistenceRepository } from '../persistence/persistence-repository.js';
import { createSettingsPersistence } from './settings-persistence.js';
import { createSettingsStore } from './settings-store.js';
import { createSettingsRecord } from './settings-model.js';

export function createSettingsRuntime({
  persistenceRepository = createPersistenceRepository(),
  store = createSettingsStore(),
} = {}) {
  const unregisterCallbacks = [];
  const persistence = createSettingsPersistence({ repository: persistenceRepository });

  function emitPersistenceFailure(emit, operation, error) {
    emit(SETTINGS_EVENTS.PERSISTENCE_FAILED, Object.freeze({
      message: error instanceof Error ? error.message : String(error),
      operation,
    }));
  }

  function persist(settings, emit, operation) {
    try {
      persistence.save(settings);
    } catch (error) {
      emitPersistenceFailure(emit, operation, error);
    }
  }

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    let hydrated = store.snapshot();
    try {
      const restored = persistence.load();
      hydrated = store.reset(restored.settings);
      if (restored.migrated) {
        persist(hydrated, emit, 'migrate');
      }
    } catch (error) {
      hydrated = store.reset();
      emitPersistenceFailure(emit, 'hydrate', error);
    }
    emit(SETTINGS_EVENTS.HYDRATED, hydrated);
    unregisterCallbacks.push(
      registerCommand(SETTINGS_COMMANDS.GET_DEFAULTS, () => createSettingsRecord()),
      registerCommand(SETTINGS_COMMANDS.GET_SNAPSHOT, () => store.snapshot()),
      registerCommand(SETTINGS_COMMANDS.UPDATE, (patch = {}) => {
        const settings = store.update(patch);
        persist(settings, emit, 'update');
        emit(SETTINGS_EVENTS.UPDATED, settings);
        return settings;
      }),
      registerCommand(SETTINGS_COMMANDS.RESET, (nextSettings = {}) => {
        const settings = store.reset(nextSettings);
        persist(settings, emit, 'reset');
        emit(SETTINGS_EVENTS.RESET, settings);
        return settings;
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.settings',
    start,
    stop,
  };
}
