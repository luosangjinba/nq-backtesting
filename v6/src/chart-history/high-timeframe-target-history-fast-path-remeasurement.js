import { auditHighTimeframeTargetHistoryResponsiveness } from './high-timeframe-target-history-responsiveness-audit.js';

export function remeasureHighTimeframeTargetHistoryFastPathResponsiveness({
  packCostControlsReady = true,
  records = [],
  targetHistoryCoverageComplete = true,
  thresholds = {},
} = {}) {
  const audit = auditHighTimeframeTargetHistoryResponsiveness({
    packCostControlsReady,
    records,
    targetHistoryCoverageComplete,
    thresholds,
  });

  if (audit.reason === 'high-timeframe-target-history-responsive-materialization-ready') {
    return {
      audit,
      nextSlice: 'replay-coordination-materialization-transition',
      ownerBoundary: 'target-history-fast-path-responsive',
      reason: 'fast-path-target-history-responsiveness-within-budget',
      status: 'materialization-ready',
    };
  }

  if (audit.reason === 'high-timeframe-target-history-responsive-budget-exceeded') {
    return {
      audit,
      nextSlice: 'target-history-fast-path-residual-latency-attribution',
      ownerBoundary: 'target-history-fast-path-responsiveness',
      reason: 'fast-path-target-history-responsiveness-budget-still-exceeded',
      status: 'residual-latency-attribution-needed',
    };
  }

  if (audit.reason === 'high-timeframe-target-history-fallback-rate-high') {
    return {
      audit,
      nextSlice: 'target-history-fallback-rate-attribution',
      ownerBoundary: 'target-history-request-coverage',
      reason: 'fast-path-target-history-fallback-rate-high',
      status: 'fallback-attribution-needed',
    };
  }

  return {
    audit,
    nextSlice: audit.nextSlice || 'high-timeframe-target-history-fast-path-responsiveness-remeasurement',
    ownerBoundary: 'target-history-fast-path-measurement',
    reason: audit.reason || 'fast-path-target-history-measurement-incomplete',
    status: 'measurement-incomplete',
  };
}
