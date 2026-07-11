const DEFAULT_CANDIDATES = Object.freeze([
  'daily-fallback-browser-coverage',
  'weekly-request-sizing-selection',
  'display-history-responsiveness-audit',
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
