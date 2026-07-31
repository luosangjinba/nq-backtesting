const MINUTE = 60_000;

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return value;
}

function bucketContainsEligibleMinute({ bucketEndEpochMs, bucketStartEpochMs, isEligibleMinute }) {
  for (let epochMs = bucketStartEpochMs; epochMs < bucketEndEpochMs; epochMs += MINUTE) {
    if (isEligibleMinute(epochMs)) return true;
  }
  return false;
}

/**
 * Plan one bounded raw window that contains the requested number of eligible
 * fixed-duration display buckets. Counting buckets here prevents RTH and large
 * timeframes from under-filling the Canvas while retaining one chart commit.
 */
export function planSingleHistoryWindow({
  durationMs,
  isEligibleMinute,
  maximumWindowMs,
  targetDisplayBars,
  windowEndEpochMs,
}) {
  requirePositiveInteger(durationMs, 'Display duration');
  requirePositiveInteger(maximumWindowMs, 'Maximum history window');
  requirePositiveInteger(targetDisplayBars, 'History display-bar target');
  requirePositiveInteger(windowEndEpochMs, 'History window end');
  if (durationMs % MINUTE !== 0 || maximumWindowMs % MINUTE !== 0) {
    throw new TypeError('History window durations must align to source minutes.');
  }
  if (typeof isEligibleMinute !== 'function') {
    throw new TypeError('History window planning requires isEligibleMinute().');
  }

  const boundedStart = Math.max(0, windowEndEpochMs - maximumWindowMs);
  let bucketStartEpochMs = Math.floor((windowEndEpochMs - 1) / durationMs) * durationMs;
  let contributingBuckets = 0;
  // An unaligned split crosses one aggregate bucket, which the incremental
  // projector deliberately reprocesses before preserving the accepted tail.
  const requiredBuckets = targetDisplayBars + (windowEndEpochMs % durationMs === 0 ? 0 : 1);
  while (bucketStartEpochMs >= boundedStart) {
    const bucketEndEpochMs = Math.min(windowEndEpochMs, bucketStartEpochMs + durationMs);
    if (bucketContainsEligibleMinute({
      bucketEndEpochMs,
      bucketStartEpochMs: Math.max(boundedStart, bucketStartEpochMs),
      isEligibleMinute,
    })) {
      contributingBuckets += 1;
      if (contributingBuckets >= requiredBuckets) return Math.max(boundedStart, bucketStartEpochMs);
    }
    bucketStartEpochMs -= durationMs;
  }
  return boundedStart;
}
