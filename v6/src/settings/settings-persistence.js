import { createPersistenceRepository } from '../persistence/persistence-repository.js';
import {
  createSettingsPersistenceValue,
  restoreSettingsPersistenceValue,
} from './settings-model.js';

export const SETTINGS_PERSISTENCE_COLLECTION = 'workspaceSettings';
export const SETTINGS_PERSISTENCE_KEY = 'global';

export function createSettingsPersistence({
  repository = createPersistenceRepository(),
} = {}) {
  function load() {
    const record = repository.get(SETTINGS_PERSISTENCE_COLLECTION, SETTINGS_PERSISTENCE_KEY);
    return restoreSettingsPersistenceValue(record?.value ?? null);
  }

  function save(settings) {
    return repository.save({
      collection: SETTINGS_PERSISTENCE_COLLECTION,
      key: SETTINGS_PERSISTENCE_KEY,
      value: createSettingsPersistenceValue(settings),
    });
  }

  return Object.freeze({
    load,
    save,
  });
}
