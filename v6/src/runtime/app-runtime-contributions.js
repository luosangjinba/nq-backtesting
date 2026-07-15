import { createCoreRuntimeContributions } from './core-runtime-manifest.js';
import { createSessionMetadataStorage } from '../session/session-metadata-storage.js';
import { createInMemorySessionRepository } from '../session/session-repository.js';
import {
  createPersistenceRepository,
  createWebStoragePersistenceAdapter,
} from '../persistence/persistence-repository.js';
import { createReplayNavigationPreferencesStorage } from '../replay-navigation/replay-navigation-preferences-storage.js';
import { createValidationRepository } from '../validation-persistence/validation-repository.js';
import { createObservationEvidenceRepository } from '../validation-observation/observation-evidence-repository.js';
import { createTradePlanRepository } from '../validation-trade-plan/trade-plan-repository.js';

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
  const observationEvidenceRepository = createObservationEvidenceRepository();
  const tradePlanRepository = createTradePlanRepository();
  return createCoreRuntimeContributions({
    dispatchCommand,
    observationEvidenceRepository,
    persistenceRepository,
    replayNavigationPreferencesStorage,
    sessionRepository,
    subscribeEvent,
    tradePlanRepository,
    validationRepository,
  });
}
