import { createHighTimeframeTargetHistoryRuntimeOptimizationProbe } from './high-timeframe-target-history-runtime-optimization-probe.js';

const DEFAULT_PHASE_BUDGETS = Object.freeze({
  'browser-visible-apply-lag': 80,
  'chart-data-replacement': 120,
  fetch: 120,
  'viewport-reapply': 80,
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mergePhaseBudgets(phaseBudgets = {}) {
  return {
    ...DEFAULT_PHASE_BUDGETS,
    ...phaseBudgets,
  };
}

function collectPhaseFindings({ phaseBudgets = {}, phaseCosts = {} } = {}) {
  return Object.entries(phaseBudgets)
    .map(([phase, budget]) => {
      const value = finiteNumber(phaseCosts[phase]);
      const resolvedBudget = finiteNumber(budget);
      if (value === null || resolvedBudget === null || value <= resolvedBudget) return null;
      return {
        budget: resolvedBudget,
        phase,
        ratio: value / resolvedBudget,
        value,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.ratio - left.ratio);
}

function phaseToSlice(phase) {
  return phase ? `target-history-${phase}-optimization` : null;
}

export function selectHighTimeframeTargetHistoryPhaseBudget({
  packCostControlsReady = true,
  phaseBudgets = {},
  records = [],
  targetHistoryCoverageComplete = true,
  thresholds = {},
} = {}) {
  const probe = createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
    packCostControlsReady,
    records,
    targetHistoryCoverageComplete,
    thresholds,
  });
  const resolvedPhaseBudgets = mergePhaseBudgets(phaseBudgets);
  const phaseFindings = collectPhaseFindings({
    phaseBudgets: resolvedPhaseBudgets,
    phaseCosts: probe.phaseCosts,
  });

  if (probe.reason === 'target-history-runtime-optimization-measurement-incomplete') {
    return {
      phaseBudgets: resolvedPhaseBudgets,
      phaseFindings,
      probe,
      selectedPhase: null,
      selectedSlice: 'high-timeframe-target-history-responsiveness-harness',
      status: 'measurement-incomplete',
    };
  }

  const selectedFinding = phaseFindings[0] || null;
  const selectedPhase = selectedFinding?.phase || probe.dominantPhase || null;
  if (selectedPhase) {
    return {
      phaseBudgets: resolvedPhaseBudgets,
      phaseFindings,
      probe,
      selectedPhase,
      selectedSlice: phaseToSlice(selectedPhase),
      status: 'optimize-phase',
    };
  }

  return {
    phaseBudgets: resolvedPhaseBudgets,
    phaseFindings,
    probe,
    selectedPhase: null,
    selectedSlice: 'replay-coordination-materialization-transition',
    status: 'materialization-ready',
  };
}
