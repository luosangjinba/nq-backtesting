const DEFAULT_CANDIDATES = Object.freeze([
  'daily-fallback-browser-coverage',
  'weekly-request-sizing-selection',
  'display-history-responsiveness-audit',
]);

const POST_COVERAGE_CANDIDATES = Object.freeze([
  'target-history-browser-pack-cost-control',
  'high-timeframe-history-responsiveness-audit',
  'replay-coordination-materialization-transition',
]);

const COVERAGE_KEYS = Object.freeze([
  'fixedSuccess',
  'fixedFallback',
  'dailySuccess',
  'dailyFallback',
  'weeklySuccess',
  'weeklyFallback',
  'monthlySuccess',
  'monthlyFallback',
]);

export function selectTargetHistoryPhaseDSlice({
  candidates = DEFAULT_CANDIDATES,
  dailySuccessPacked = false,
  fixedSuccessFallbackPacked = false,
} = {}) {
  const available = new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
  if (
    available.has('daily-fallback-browser-coverage')
    && dailySuccessPacked
    && fixedSuccessFallbackPacked
  ) {
    return {
      reason: 'daily-success-packed-fallback-gap-remains',
      slice: 'daily-fallback-browser-coverage',
    };
  }
  if (available.has('weekly-request-sizing-selection')) {
    return {
      reason: 'session-aware-weekly-sizing-next-candidate',
      slice: 'weekly-request-sizing-selection',
    };
  }
  if (available.has('display-history-responsiveness-audit')) {
    return {
      reason: 'target-history-pack-ready-for-responsiveness-audit',
      slice: 'display-history-responsiveness-audit',
    };
  }
  return {
    reason: 'no-target-history-phase-d-candidate',
    slice: null,
  };
}

export function auditTargetHistoryPhaseDCoverage(coverage = {}) {
  const covered = COVERAGE_KEYS.filter((key) => Boolean(coverage[key]));
  const missing = COVERAGE_KEYS.filter((key) => !coverage[key]);
  return {
    complete: missing.length === 0,
    covered,
    coveredCount: covered.length,
    expectedCount: COVERAGE_KEYS.length,
    missing,
  };
}

export function selectTargetHistoryPhaseDPostCoverageSlice({
  candidates = POST_COVERAGE_CANDIDATES,
  coverage = {},
} = {}) {
  const audit = auditTargetHistoryPhaseDCoverage(coverage);
  const available = new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
  if (!audit.complete) {
    return {
      audit,
      reason: 'target-history-phase-d-coverage-incomplete',
      slice: null,
    };
  }
  if (available.has('target-history-browser-pack-cost-control')) {
    return {
      audit,
      reason: 'target-history-browser-pack-complete-cost-control-next',
      slice: 'target-history-browser-pack-cost-control',
    };
  }
  if (available.has('high-timeframe-history-responsiveness-audit')) {
    return {
      audit,
      reason: 'target-history-browser-coverage-complete-responsiveness-next',
      slice: 'high-timeframe-history-responsiveness-audit',
    };
  }
  if (available.has('replay-coordination-materialization-transition')) {
    return {
      audit,
      reason: 'target-history-browser-coverage-complete-transition-next',
      slice: 'replay-coordination-materialization-transition',
    };
  }
  return {
    audit,
    reason: 'no-target-history-post-coverage-candidate',
    slice: null,
  };
}
