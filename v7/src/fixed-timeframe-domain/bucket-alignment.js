import { failFixedTimeframe } from './fixed-timeframe-error.js';
import { exactRecord, nonNegativeSafeInteger, normalizeFixedConfiguration } from './validation.js';

/** Resolve a canonical Unix/clock-aligned bucket start with an explicit offset. */
export function resolveFixedBucketStart(value) {
  exactRecord(value, ['durationMs', 'offsetMs', 'sourceDurationMs', 'startEpochMs'], 'bucket input');
  const config = normalizeFixedConfiguration(value);
  const startEpochMs = nonNegativeSafeInteger(value.startEpochMs, 'startEpochMs');
  if (startEpochMs % config.sourceDurationMs !== 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_SOURCE_MISALIGNED', 'Source bar is not aligned to sourceDurationMs.');
  }
  const bucketStart = Math.floor(
    (startEpochMs - config.offsetMs) / config.durationMs,
  ) * config.durationMs + config.offsetMs;
  if (!Number.isSafeInteger(bucketStart) || bucketStart < 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_BUCKET_INVALID', 'Resolved bucket start is outside the supported epoch range.');
  }
  return bucketStart;
}
