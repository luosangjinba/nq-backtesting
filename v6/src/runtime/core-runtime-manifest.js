import { createPersistenceRepository } from '../persistence/persistence-repository.js';
import { createCoreStateRuntimeContributions } from './core-state-runtime-contributions.js';
import { createReplayPipelineRuntimeContributions } from './replay-pipeline-runtime-contributions.js';
import { createValidationRuntimeContributions } from './validation-runtime-contributions.js';

export function createCoreRuntimeContributions({
  campaignSummaryRepository,
  dispatchCommand,
  persistenceRepository = createPersistenceRepository(),
  replayNavigationPreferencesStorage,
  simulatedOutcomeRepository,
  observationEvidenceRepository,
  sessionRepository,
  subscribeEvent,
  tradePlanRepository,
  validationRepository,
} = {}) {
  return Object.freeze([
    ...createCoreStateRuntimeContributions({
      persistenceRepository,
      sessionRepository,
    }),
    ...createReplayPipelineRuntimeContributions({
      dispatchCommand,
      replayNavigationPreferencesStorage,
      subscribeEvent,
    }),
    ...createValidationRuntimeContributions({
      campaignSummaryRepository,
      dispatchCommand,
      observationEvidenceRepository,
      simulatedOutcomeRepository,
      tradePlanRepository,
      validationRepository,
    }),
  ]);
}
