import { createBlindTrialCoordinatorRuntime } from '../blind-trial/blind-trial-coordinator-runtime.js';
import { createObservationEvidenceRuntime } from '../validation-observation/observation-evidence-runtime.js';

export function createValidationRuntimeContributions({
  dispatchCommand,
  observationEvidenceRepository,
  validationRepository,
} = {}) {
  if (!validationRepository) return Object.freeze([]);
  return Object.freeze([
    createBlindTrialCoordinatorRuntime({
      dispatchCommand,
      repository: validationRepository,
    }),
    ...(observationEvidenceRepository ? [createObservationEvidenceRuntime({
      dispatchCommand,
      repository: observationEvidenceRepository,
    })] : []),
  ]);
}
