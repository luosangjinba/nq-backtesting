import { createReplayRange, requireCursorInRange } from '../replay-contract/public.js';
import { ReplayPrefetchContractError } from './prefetch-error.js';
import { createReplayPrefetchPolicy } from './prefetch-policy.js';

function requireCoverageEnd(value, cursorEpochMs, range) {
  if (!Number.isSafeInteger(value) || value < cursorEpochMs || value > range.endEpochMs) {
    throw new ReplayPrefetchContractError(
      'REPLAY_PREFETCH_COVERAGE_INVALID',
      'Contiguous coverage end must be between Replay cursor and Session end.',
    );
  }
  return value;
}

/**
 * Returns acquisition advice only. The Workspace coordinator maps this window
 * to complete provider identity and Bar Data Runtime remains the sole requester.
 */
export function adviseReplayPrefetch({
  range,
  cursorEpochMs,
  contiguousCoverageEndEpochMs,
  policy,
}) {
  const acceptedRange = createReplayRange(range);
  const cursor = requireCursorInRange(cursorEpochMs, acceptedRange);
  const coverageEnd = requireCoverageEnd(
    contiguousCoverageEndEpochMs,
    cursor,
    acceptedRange,
  );
  const acceptedPolicy = createReplayPrefetchPolicy(policy);
  if (cursor === acceptedRange.endEpochMs) return null;
  const aheadMs = coverageEnd - cursor;
  if (aheadMs >= acceptedPolicy.lowWatermarkMs) return null;
  const availableToEndMs = acceptedRange.endEpochMs - cursor;
  const targetAheadMs = Math.min(acceptedPolicy.highWatermarkMs, availableToEndMs);
  const windowEndEpochMs = cursor + targetAheadMs;
  if (coverageEnd >= windowEndEpochMs) return null;
  return Object.freeze({
    reason: 'below-low-watermark',
    windowEndEpochMs,
    windowStartEpochMs: coverageEnd,
  });
}
