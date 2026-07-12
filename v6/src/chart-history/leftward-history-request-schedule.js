const PROGRAMMATIC_FAST_PATH_REASONS = new Set([
  'runtime-display-timeframe-applied',
  'runtime-viewport-projected',
]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedDelay(value) {
  return Math.max(0, finiteNumber(value) ?? 0);
}

function shouldRequest(visibleRange = {}) {
  const from = finiteNumber(visibleRange.from);
  const to = finiteNumber(visibleRange.to);
  return from !== null && to !== null && from < 0;
}

export function resolveLeftwardHistoryRequestSchedule({
  nativeTargetHistoryDelayMs = null,
  reason = 'native-visible-range',
  requestDelayMs = 500,
  targetHistoryEnabled = false,
  visibleRange = null,
} = {}) {
  const delayMs = normalizedDelay(requestDelayMs);
  const targetHistoryNativeDelayMs = nativeTargetHistoryDelayMs === null
    || nativeTargetHistoryDelayMs === undefined
    ? delayMs
    : normalizedDelay(nativeTargetHistoryDelayMs);
  if (!shouldRequest(visibleRange)) {
    return {
      delayMs: null,
      mode: 'ignored',
      reason: 'visible-range-does-not-require-leftward-history',
      shouldDispatch: false,
    };
  }

  if (PROGRAMMATIC_FAST_PATH_REASONS.has(reason) && targetHistoryEnabled === true) {
    return {
      delayMs: 0,
      mode: 'programmatic-target-history-fast-path',
      reason: 'programmatic-target-history-runtime-event',
      shouldDispatch: true,
    };
  }

  if (reason === 'native-visible-range' && targetHistoryEnabled === true) {
    return {
      delayMs: targetHistoryNativeDelayMs,
      mode: targetHistoryNativeDelayMs === delayMs
        ? 'delayed'
        : 'native-target-history-reduced-delay',
      reason: targetHistoryNativeDelayMs === delayMs
        ? 'native-visible-range'
        : 'native-target-history-reduced-delay-with-coalescing',
      shouldDispatch: true,
    };
  }

  return {
    delayMs,
    mode: 'delayed',
    reason: reason || 'native-visible-range',
    shouldDispatch: true,
  };
}
