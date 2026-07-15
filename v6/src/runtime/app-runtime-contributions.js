import { createCoreRuntimeContributions } from './core-runtime-manifest.js';
import { createSessionMetadataStorage } from '../session/session-metadata-storage.js';
import { createInMemorySessionRepository } from '../session/session-repository.js';
import {
  createPersistenceRepository,
  createWebStoragePersistenceAdapter,
} from '../persistence/persistence-repository.js';
import { createReplayNavigationPreferencesStorage } from '../replay-navigation/replay-navigation-preferences-storage.js';
import { createValidationRepository } from '../validation-persistence/validation-repository.js';

export function createAppRuntimeContributions({
  dispatchCommand,
  subscribeEvent,
} = {}) {
  const sessionRepository = createInMemorySessionRepository({
    metadataStore: createSessionMetadataStorage(),
  });
  const replayNavigationPreferencesStorage = createReplayNavigationPreferencesStorage();
  const persistenceRepository = createPersistenceRepository({
    adapter: createWebStoragePersistenceAdapter(),
  });
  const validationRepository = createValidationRepository();
  return createCoreRuntimeContributions({
    dispatchCommand,
    persistenceRepository,
    replayNavigationPreferencesStorage,
    sessionRepository,
    subscribeEvent,
    validationRepository,
  });
}
