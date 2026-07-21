import { isValidatedRawBar } from '../bar-data-contract/public.js';
import { failFixedTimeframe } from './fixed-timeframe-error.js';
import { exactRecord, normalizeFixedConfiguration } from './validation.js';

function requireBar(bar, previousStart) {
  if (!isValidatedRawBar(bar)) {
    exactRecord(bar, ['startEpochMs', 'open', 'high', 'low', 'close', 'volume'], 'source bar');
  }
  if (!Number.isSafeInteger(bar.startEpochMs) || bar.startEpochMs < 0 || bar.startEpochMs <= previousStart) {
    failFixedTimeframe('FIXED_TIMEFRAME_SOURCE_NOT_ORDERED', 'Source bars must be strictly ordered and unique.');
  }
  for (const field of ['open', 'high', 'low', 'close']) {
    if (!Number.isFinite(bar[field])) {
      failFixedTimeframe('FIXED_TIMEFRAME_PRICE_INVALID', `Source ${field} must be finite.`);
    }
  }
  if (bar.high < Math.max(bar.open, bar.low, bar.close)
    || bar.low > Math.min(bar.open, bar.high, bar.close)) {
    failFixedTimeframe('FIXED_TIMEFRAME_ENVELOPE_INVALID', 'Source OHLC envelope is invalid.');
  }
  if (bar.volume !== null && (!Number.isFinite(bar.volume) || bar.volume < 0)) {
    failFixedTimeframe('FIXED_TIMEFRAME_VOLUME_INVALID', 'Source volume must be null or non-negative.');
  }
}

function beginBucket(bar, startEpochMs, { durationMs, sourceDurationMs }) {
  return {
    displayEpochMs: startEpochMs + durationMs - sourceDurationMs,
    startEpochMs,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

function extendBucket(bucket, bar) {
  bucket.high = Math.max(bucket.high, bar.high);
  bucket.low = Math.min(bucket.low, bar.low);
  bucket.close = bar.close;
  const volume = bucket.volume === null || bar.volume === null
    ? null
    : bucket.volume + bar.volume;
  if (volume !== null && !Number.isFinite(volume)) {
    failFixedTimeframe('FIXED_TIMEFRAME_VOLUME_INVALID', 'Aggregated volume exceeds the finite range.');
  }
  bucket.volume = volume;
}

/** Aggregate ordered eligible source bars into deterministic fixed-duration OHLCV bars. */
export function projectFixedDurationBars(value) {
  exactRecord(value, ['bars', 'durationMs', 'offsetMs', 'sourceDurationMs'], 'aggregation input');
  const config = normalizeFixedConfiguration(value);
  if (!Array.isArray(value.bars) || value.bars.length === 0) {
    failFixedTimeframe('FIXED_TIMEFRAME_SOURCE_EMPTY', 'At least one eligible source bar is required.');
  }
  const buckets = [];
  let current = null;
  let previousStart = -1;
  for (const bar of value.bars) {
    requireBar(bar, previousStart);
    if (bar.startEpochMs % config.sourceDurationMs !== 0) {
      failFixedTimeframe('FIXED_TIMEFRAME_SOURCE_MISALIGNED', 'Source bar is not aligned to sourceDurationMs.');
    }
    const bucketStart = Math.floor(
      (bar.startEpochMs - config.offsetMs) / config.durationMs,
    ) * config.durationMs + config.offsetMs;
    if (!current || current.startEpochMs !== bucketStart) {
      if (current) buckets.push(Object.freeze(current));
      current = beginBucket(bar, bucketStart, config);
    } else {
      extendBucket(current, bar);
    }
    previousStart = bar.startEpochMs;
  }
  buckets.push(Object.freeze(current));
  return Object.freeze(buckets);
}
