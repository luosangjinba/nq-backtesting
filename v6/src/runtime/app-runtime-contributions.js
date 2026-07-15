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
import { createSimulatedOutcomeRepository } from '../validation-outcome/simulated-outcome-repository.js';
import { createCampaignSummaryRepository } from '../validation-summary/campaign-summary-repository.js';

export function createAppRuntimeContributions({
  dispatchCommand,
  subscribeEvent,
} = {}) {
  const campaignSummaryRepository = createCampaignSummaryRepository();
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
  const simulatedOutcomeRepository = createSimulatedOutcomeRepository();
  return createCoreRuntimeContributions({
    campaignSummaryRepository,
    dispatchCommand,
    observationEvidenceRepository,
    persistenceRepository,
    replayNavigationPreferencesStorage,
    sessionRepository,
    simulatedOutcomeRepository,
    subscribeEvent,
    tradePlanRepository,
    validationRepository,
  });
}
