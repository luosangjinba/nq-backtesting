import { createBlindTrialCoordinatorRuntime } from '../blind-trial/blind-trial-coordinator-runtime.js';
import { createObservationEvidenceRuntime } from '../validation-observation/observation-evidence-runtime.js';
import { createTradePlanRuntime } from '../validation-trade-plan/trade-plan-runtime.js';
import { createSimulatedOutcomeRuntime } from '../validation-outcome/simulated-outcome-runtime.js';

export function createValidationRuntimeContributions({
  dispatchCommand,
  observationEvidenceRepository,
  simulatedOutcomeRepository,
  tradePlanRepository,
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
    ...(tradePlanRepository ? [createTradePlanRuntime({ repository: tradePlanRepository })] : []),
    ...(simulatedOutcomeRepository ? [createSimulatedOutcomeRuntime({ repository: simulatedOutcomeRepository })] : []),
  ]);
}
