const DEFAULT_SUBFRAME_NOISE_MS = 16;

const RUNTIME_PHASE_SLICES = Object.freeze({
  'browser-visible-apply-lag': 'target-history-browser-visible-apply-lag-optimization',
  'chart-data-replacement': 'target-history-chart-data-replacement-optimization',
  fetch: 'target-history-fetch-optimization',
  'viewport-reapply': 'target-history-viewport-reapply-optimization',
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function phaseCost(selection = {}, phase) {
  return finiteNumber(selection.probe?.phaseCosts?.[phase]);
}

function phaseBudget(selection = {}, phase) {
  return finiteNumber(selection.phaseBudgets?.[phase]);
}

function isSubframeNoise(value, subframeNoiseMs) {
  const number = finiteNumber(value);
  const limit = finiteNumber(subframeNoiseMs) ?? DEFAULT_SUBFRAME_NOISE_MS;
  return number !== null && number <= limit;
}

function runtimePhaseFinding(selection = {}, subframeNoiseMs) {
  const phase = selection.selectedPhase || null;
  if (!phase || !RUNTIME_PHASE_SLICES[phase]) return null;
  const cost = phaseCost(selection, phase);
  const budget = phaseBudget(selection, phase);
  if (cost === null || budget === null || cost <= budget) return null;
  if (isSubframeNoise(cost, subframeNoiseMs)) return null;
  return {
    budget,
    cost,
    phase,
    slice: RUNTIME_PHASE_SLICES[phase],
  };
}

export function stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution({
  selection = {},
  subframeNoiseMs = DEFAULT_SUBFRAME_NOISE_MS,
} = {}) {
  const summary = selection.probe?.budgetReport?.summary || {};
  const thresholds = selection.probe?.budgetReport?.thresholds || {};
  const visualLatency = finiteNumber(summary.visualLatencyP95Ms);
  const visualLatencyBudget = finiteNumber(thresholds.maxVisualLatencyMs);
  const applyLag = finiteNumber(summary.applyLagP95Ms);
  const applyLagBudget = finiteNumber(thresholds.maxApplyLagMs);
  const runtimeFinding = runtimePhaseFinding(selection, subframeNoiseMs);

  if (runtimeFinding) {
    return {
      nextSlice: runtimeFinding.slice,
      ownerBoundary: runtimeFinding.phase,
      reason: 'runtime-phase-cost-exceeds-budget-above-subframe-noise',
      selectedPhase: runtimeFinding.phase,
      status: 'runtime-phase-stable',
      suppressedPhase: null,
    };
  }

  if (
    applyLag !== null &&
    applyLagBudget !== null &&
    applyLag > applyLagBudget &&
    !isSubframeNoise(applyLag, subframeNoiseMs)
  ) {
    return {
      nextSlice: RUNTIME_PHASE_SLICES['browser-visible-apply-lag'],
      ownerBoundary: 'browser-visible-apply-lag',
      reason: 'apply-lag-exceeds-budget-above-subframe-noise',
      selectedPhase: 'browser-visible-apply-lag',
      status: 'runtime-phase-stable',
      suppressedPhase: null,
    };
  }

  if (
    visualLatency !== null &&
    visualLatencyBudget !== null &&
    visualLatency > visualLatencyBudget
  ) {
    return {
      nextSlice: 'target-history-browser-rendering-visibility-attribution',
      ownerBoundary: 'browser-rendering-or-measurement-boundary',
      reason: 'visual-latency-exceeds-budget-with-only-subframe-runtime-phase-costs',
      selectedPhase: null,
      status: 'visual-latency-attribution-needed',
      suppressedPhase: selection.selectedPhase || null,
    };
  }

  return {
    nextSlice: 'replay-coordination-materialization-transition',
    ownerBoundary: 'target-history-responsive',
    reason: 'corrected-visual-latency-within-budget',
    selectedPhase: null,
    status: 'materialization-ready',
    suppressedPhase: null,
  };
}
