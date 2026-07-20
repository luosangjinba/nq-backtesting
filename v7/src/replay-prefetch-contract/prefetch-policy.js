import { ReplayPrefetchContractError } from './prefetch-error.js';

function requirePositiveDuration(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ReplayPrefetchContractError(
      'REPLAY_PREFETCH_DURATION_INVALID',
      `${field} must be a positive safe-integer duration.`,
    );
  }
  return value;
}

export function createReplayPrefetchPolicy({ lowWatermarkMs, highWatermarkMs }) {
  const low = requirePositiveDuration(lowWatermarkMs, 'lowWatermarkMs');
  const high = requirePositiveDuration(highWatermarkMs, 'highWatermarkMs');
  if (high <= low) {
    throw new ReplayPrefetchContractError(
      'REPLAY_PREFETCH_WATERMARK_ORDER',
      'High watermark must be greater than low watermark.',
    );
  }
  return Object.freeze({ highWatermarkMs: high, lowWatermarkMs: low });
}
