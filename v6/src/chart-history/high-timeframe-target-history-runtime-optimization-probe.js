import { createHighTimeframeTargetHistoryResponsivenessBudgetReport } from './high-timeframe-target-history-responsiveness-budget-decision.js';

const PHASES = Object.freeze([
  'fetch',
  'chart-data-replacement',
  'viewport-reapply',
  'browser-visible-apply-lag',
]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function max(values = []) {
  const numbers = values.map(finiteNumber).filter((value) => value !== null);
  if (!numbers.length) return null;
  return Math.max(...numbers);
}

function phaseValue(record = {}, phase) {
  if (phase === 'fetch') {
    return finiteNumber(record.fetchMs ?? record.targetLoadMs ?? record.sourceLoadMs);
  }
  if (phase === 'chart-data-replacement') {
    return finiteNumber(record.chartDataReplacementMs ?? record.chartDataMs);
  }
  if (phase === 'viewport-reapply') {
    return finiteNumber(record.viewportReapplyMs ?? record.viewportMs);
  }
  if (phase === 'browser-visible-apply-lag') {
    return finiteNumber(record.applyLagMs);
  }
  return null;
}

function summarizePhaseCosts(records = []) {
  return Object.fromEntries(PHASES.map((phase) => [
    phase,
    max(records.map((record) => phaseValue(record, phase))),
  ]));
}

function dominantPhaseFromCosts(phaseCosts = {}) {
  return PHASES.reduce((winner, phase) => {
    const value = finiteNumber(phaseCosts[phase]);
    if (value === null) return winner;
    if (!winner || value > winner.value) {
      return { phase, value };
    }
    return winner;
  }, null);
}

function dominantPhaseFromFindings(findings = []) {
  const metrics = new Set(findings.map((finding) => finding.metric));
  if (metrics.has('applyLagP95Ms')) return 'browser-visible-apply-lag';
  if (metrics.has('visualLatencyP95Ms')) return 'browser-visible-apply-lag';
  if (metrics.has('durationP95Ms')) return 'fetch';
  if (metrics.has('fallbackRate')) return 'fetch';
  return null;
}

export function createHighTimeframeTargetHistoryRuntimeOptimizationProbe({
  packCostControlsReady = true,
  records = [],
  targetHistoryCoverageComplete = true,
  thresholds = {},
} = {}) {
  const budgetReport = createHighTimeframeTargetHistoryResponsivenessBudgetReport({
    packCostControlsReady,
    records,
    targetHistoryCoverageComplete,
    thresholds,
  });
  const phaseCosts = summarizePhaseCosts(records);

  if (budgetReport.outcome === 'measurement-incomplete') {
    return {
      budgetReport,
      dominantPhase: null,
      nextSlice: 'high-timeframe-target-history-responsiveness-harness',
      phaseCosts,
      reason: 'target-history-runtime-optimization-measurement-incomplete',
      recommendation: 'collect-browser-visible-samples',
    };
  }

  if (budgetReport.outcome === 'materialization-transition-ready') {
    return {
      budgetReport,
      dominantPhase: null,
      nextSlice: 'replay-coordination-materialization-transition',
      phaseCosts,
      reason: 'target-history-runtime-optimization-not-needed',
      recommendation: 'start-materialization-transition',
    };
  }

  const dominantFromCosts = dominantPhaseFromCosts(phaseCosts);
  const dominantPhase = dominantFromCosts?.phase || dominantPhaseFromFindings(budgetReport.budgetFindings);
  return {
    budgetReport,
    dominantPhase,
    nextSlice: dominantPhase
      ? `target-history-${dominantPhase}-optimization`
      : 'target-history-runtime-phase-timing-probe',
    phaseCosts,
    reason: dominantPhase
      ? 'target-history-runtime-optimization-dominant-phase-found'
      : 'target-history-runtime-optimization-phase-timing-needed',
    recommendation: dominantPhase
      ? 'optimize-dominant-phase'
      : 'add-phase-timing-before-runtime-change',
  };
}
