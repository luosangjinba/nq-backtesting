import { createPersistenceRepository } from '../persistence/persistence-repository.js';
import { createCoreStateRuntimeContributions } from './core-state-runtime-contributions.js';
import { createReplayPipelineRuntimeContributions } from './replay-pipeline-runtime-contributions.js';
import { createValidationRuntimeContributions } from './validation-runtime-contributions.js';

export function createCoreRuntimeContributions({
  dispatchCommand,
  persistenceRepository = createPersistenceRepository(),
  replayNavigationPreferencesStorage,
  observationEvidenceRepository,
  sessionRepository,
  subscribeEvent,
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
      dispatchCommand,
      observationEvidenceRepository,
      validationRepository,
    }),
  ]);
}
