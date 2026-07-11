const DEFAULT_THRESHOLDS = Object.freeze({
  fallbackRateLimit: 0.2,
  maxApplyLagMs: 80,
  maxDurationMs: 250,
  maxVisualLatencyMs: 350,
  minBrowserSamples: 3,
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentile(values = [], percentileRank = 0.95) {
  const numbers = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!numbers.length) return null;
  const index = Math.min(
    numbers.length - 1,
    Math.max(0, Math.ceil(numbers.length * percentileRank) - 1),
  );
  return numbers[index];
}

function collectMetrics(records, field) {
  return records.map((record) => finiteNumber(record?.[field])).filter((value) => value !== null);
}

function summarizeRecords(records = []) {
  const normalized = records.filter(Boolean);
  const browserRecords = normalized.filter((record) => record.browserVisible === true);
  const targetRecords = normalized.filter((record) => record.path === 'target-history');
  const fallbackRecords = normalized.filter((record) => String(record.path || '').includes('fallback'));
  const sourceRecords = normalized.filter((record) => record.path === 'source-window');
  const targetAttempts = targetRecords.length + fallbackRecords.length;
  return {
    applyLagP95Ms: percentile(collectMetrics(normalized, 'applyLagMs')),
    browserSampleCount: browserRecords.length,
    durationP95Ms: percentile(collectMetrics(normalized, 'durationMs')),
    fallbackCount: fallbackRecords.length,
    fallbackRate: targetAttempts > 0 ? fallbackRecords.length / targetAttempts : null,
    sourceCount: sourceRecords.length,
    targetCount: targetRecords.length,
    totalCount: normalized.length,
    visualLatencyP95Ms: percentile(collectMetrics(browserRecords, 'visualLatencyMs')),
  };
}

function mergeThresholds(thresholds = {}) {
  return {
    ...DEFAULT_THRESHOLDS,
    ...thresholds,
  };
}

export function auditHighTimeframeTargetHistoryResponsiveness({
  packCostControlsReady = false,
  records = [],
  targetHistoryCoverageComplete = false,
  thresholds = {},
} = {}) {
  const resolvedThresholds = mergeThresholds(thresholds);
  const summary = summarizeRecords(records);

  if (!targetHistoryCoverageComplete || !packCostControlsReady) {
    return {
      nextSlice: null,
      reason: 'target-history-prerequisites-incomplete',
      summary,
      thresholds: resolvedThresholds,
    };
  }

  if (
    summary.browserSampleCount < resolvedThresholds.minBrowserSamples
    || summary.visualLatencyP95Ms === null
  ) {
    return {
      nextSlice: 'responsiveness-harness',
      reason: 'high-timeframe-responsiveness-browser-measurement-missing',
      summary,
      thresholds: resolvedThresholds,
    };
  }

  if (
    summary.fallbackRate !== null
    && summary.fallbackRate > resolvedThresholds.fallbackRateLimit
  ) {
    return {
      nextSlice: 'bounded-runtime-optimization',
      reason: 'high-timeframe-target-history-fallback-rate-high',
      summary,
      thresholds: resolvedThresholds,
    };
  }

  if (
    (summary.durationP95Ms !== null && summary.durationP95Ms > resolvedThresholds.maxDurationMs)
    || (summary.visualLatencyP95Ms !== null && summary.visualLatencyP95Ms > resolvedThresholds.maxVisualLatencyMs)
    || (summary.applyLagP95Ms !== null && summary.applyLagP95Ms > resolvedThresholds.maxApplyLagMs)
  ) {
    return {
      nextSlice: 'bounded-runtime-optimization',
      reason: 'high-timeframe-target-history-responsive-budget-exceeded',
      summary,
      thresholds: resolvedThresholds,
    };
  }

  return {
    nextSlice: 'replay-coordination-materialization-transition',
    reason: 'high-timeframe-target-history-responsive-materialization-ready',
    summary,
    thresholds: resolvedThresholds,
  };
}
