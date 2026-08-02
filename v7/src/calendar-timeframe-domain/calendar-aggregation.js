import { isValidatedRawBar } from '../bar-data-contract/public.js';
import { failCalendarTimeframe } from './calendar-timeframe-error.js';
import { resolveCalendarPeriod } from './calendar-alignment.js';
import { exactRecord } from './validation.js';

const MINUTE = 60_000;
const MAXIMUM_DISPLAY_SEARCH_MINUTES = 14 * 24 * 60;

function requireBar(bar, previousStartEpochMs, sourceDurationMs) {
  if (!isValidatedRawBar(bar)) {
    exactRecord(bar, ['startEpochMs', 'open', 'high', 'low', 'close', 'volume'], 'source bar');
  }
  if (!Number.isSafeInteger(bar.startEpochMs) || bar.startEpochMs < 0
    || bar.startEpochMs <= previousStartEpochMs
    || bar.startEpochMs % sourceDurationMs !== 0) {
    failCalendarTimeframe(
      'CALENDAR_TIMEFRAME_SOURCE_NOT_ORDERED',
      'Source bars must be strictly ordered, unique, and source-grid aligned.',
    );
  }
  for (const field of ['open', 'high', 'low', 'close']) {
    if (!Number.isFinite(bar[field])) {
      failCalendarTimeframe('CALENDAR_TIMEFRAME_PRICE_INVALID', `Source ${field} must be finite.`);
    }
  }
  if (bar.high < Math.max(bar.open, bar.low, bar.close)
    || bar.low > Math.min(bar.open, bar.high, bar.close)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_ENVELOPE_INVALID', 'Source OHLC envelope is invalid.');
  }
  if (bar.volume !== null && (!Number.isFinite(bar.volume) || bar.volume < 0)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_VOLUME_INVALID', 'Source volume must be null or non-negative.');
  }
}

function displayEpochMs(nextWallStartEpochMs, configuration) {
  let wallEpochMs = nextWallStartEpochMs - MINUTE;
  for (let count = 0; count < MAXIMUM_DISPLAY_SEARCH_MINUTES; count += 1) {
    if (configuration.isEligibleWallEpoch(wallEpochMs)) {
      return configuration.toInstantEpochMs(wallEpochMs);
    }
    wallEpochMs -= MINUTE;
  }
  failCalendarTimeframe(
    'CALENDAR_TIMEFRAME_DISPLAY_UNRESOLVED',
    'No eligible completion minute exists before the next calendar period.',
  );
}

function beginBucket(bar, alignment, configuration) {
  const startEpochMs = configuration.toInstantEpochMs(alignment.wallStartEpochMs);
  const completionEpochMs = displayEpochMs(alignment.nextWallStartEpochMs, configuration);
  if (!Number.isSafeInteger(startEpochMs) || startEpochMs < 0
    || !Number.isSafeInteger(completionEpochMs) || completionEpochMs < startEpochMs) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_OUTPUT_TIME_INVALID', 'Calendar bucket times are invalid.');
  }
  return {
    close: bar.close,
    displayEpochMs: completionEpochMs,
    high: bar.high,
    labelDate: new Date(alignment.tradingPeriodStartEpochMs).toISOString().slice(0, 10),
    low: bar.low,
    open: bar.open,
    startEpochMs,
    volume: bar.volume,
  };
}

function extendBucket(bucket, bar) {
  bucket.high = Math.max(bucket.high, bar.high);
  bucket.low = Math.min(bucket.low, bar.low);
  bucket.close = bar.close;
  bucket.volume = bucket.volume === null || bar.volume === null
    ? null : bucket.volume + bar.volume;
  if (bucket.volume !== null && !Number.isFinite(bucket.volume)) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_VOLUME_INVALID', 'Aggregated volume exceeds the finite range.');
  }
}

/** Aggregate ordered eligible source bars into deterministic trading-day/week/month OHLCV bars. */
export function projectCalendarBars({ bars, ...configuration }) {
  if (!Array.isArray(bars) || bars.length === 0) {
    failCalendarTimeframe('CALENDAR_TIMEFRAME_SOURCE_EMPTY', 'At least one eligible source bar is required.');
  }
  const buckets = [];
  let current = null;
  let previousStartEpochMs = -1;
  for (const bar of bars) {
    requireBar(bar, previousStartEpochMs, configuration.sourceDurationMs);
    const alignment = resolveCalendarPeriod({
      period: configuration.period,
      rollsToNextTradingDay: configuration.rollsToNextTradingDay,
      sessionStartMinute: configuration.sessionStartMinute,
      wallEpochMs: configuration.toWallEpochMs(bar.startEpochMs),
    });
    const bucketStartEpochMs = configuration.toInstantEpochMs(alignment.wallStartEpochMs);
    if (!current || current.startEpochMs !== bucketStartEpochMs) {
      if (current) buckets.push(Object.freeze(current));
      current = beginBucket(bar, alignment, configuration);
    } else {
      extendBucket(current, bar);
    }
    previousStartEpochMs = bar.startEpochMs;
  }
  buckets.push(Object.freeze(current));
  return Object.freeze(buckets);
}
