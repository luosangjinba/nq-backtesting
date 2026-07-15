import { createBlindTrialCoordinatorRuntime } from '../blind-trial/blind-trial-coordinator-runtime.js';

export function createValidationRuntimeContributions({
  dispatchCommand,
  validationRepository,
} = {}) {
  if (!validationRepository) return Object.freeze([]);
  return Object.freeze([
    createBlindTrialCoordinatorRuntime({
      dispatchCommand,
      repository: validationRepository,
    }),
  ]);
}
