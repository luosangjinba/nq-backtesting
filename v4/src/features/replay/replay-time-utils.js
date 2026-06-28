import { getBucketStart } from '../../chart/time-projection.js';
import { dateKeyFromTimestamp, formatTimeInput } from '../../utils.js';

export function formatReplayTime(bar) {
  if (!bar) return '--';
  return bar.tradingDay || bar.time || '--';
}

export function parseDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isTimestampInRange(timestamp, start, end) {
  const startMs = parseDateTime(start);
  const endMs = parseDateTime(end);
  const targetMs = Number(timestamp) * 1000;
  return (
    startMs !== null &&
    endMs !== null &&
    Number.isFinite(targetMs) &&
    targetMs >= startMs &&
    targetMs <= endMs
  );
}

export function findBarIndexAtOrBeforeTimestamp(bars, targetTimestamp, timeframe) {
  if (!bars.length || targetTimestamp === null || targetTimestamp === undefined) return -1;
  const tfSeconds = Number(timeframe) * 60;
  const firstTimestamp = bars[0].timestamp;
  const lastTimestamp = bars[bars.length - 1].timestamp;

  if (targetTimestamp < firstTimestamp || targetTimestamp >= lastTimestamp + tfSeconds) {
    return -1;
  }

  let matchedIndex = -1;
  for (let i = 0; i < bars.length; i += 1) {
    if (bars[i].timestamp > targetTimestamp) break;
    matchedIndex = i;
  }

  return matchedIndex;
}

export function getUtcDateKey(timestamp) {
  return dateKeyFromTimestamp(timestamp);
}

export function getUtcDateTimeTimestamp(dateKey, hour, minute) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return Math.floor(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hour,
    minute,
    0
  ) / 1000);
}

function makeTradingDay(timestamp) {
  return dateKeyFromTimestamp(timestamp);
}

export function aggregatePartialBar(sourceBars, bucketStart, cursorTimestamp, timeframe) {
  const bucketEnd = bucketStart + timeframe * 60;
  const bars = sourceBars.filter((bar) => (
    Number(bar?.timestamp) >= bucketStart &&
    Number(bar?.timestamp) <= cursorTimestamp &&
    Number(bar?.timestamp) < bucketEnd
  ));
  if (!bars.length) return null;

  return bars.reduce((partial, bar, index) => {
    if (index === 0) {
      return {
        timestamp: bucketStart,
        tradingDay: timeframe === 1440 ? makeTradingDay(bucketStart + 24 * 60 * 60) : bar.tradingDay,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0,
      };
    }
    partial.high = Math.max(partial.high, bar.high);
    partial.low = Math.min(partial.low, bar.low);
    partial.close = bar.close;
    partial.volume += bar.volume || 0;
    return partial;
  }, null);
}

export function getReplayRestoreDisplayBars(baseBars, timeframe, cursorTimestamp, restoreSnapshot = null) {
  if (!restoreSnapshot?.enabled || !Number.isFinite(Number(cursorTimestamp))) return baseBars;
  const sourceTimeframe = Number(restoreSnapshot.sourceTimeframe);
  const targetTimeframe = Number(timeframe);
  if (
    !Number.isFinite(sourceTimeframe) ||
    !Number.isFinite(targetTimeframe) ||
    targetTimeframe <= sourceTimeframe
  ) {
    return baseBars;
  }

  const sourceBars = Array.isArray(restoreSnapshot.sourceBars) ? restoreSnapshot.sourceBars : [];
  if (!sourceBars.length) return baseBars;

  const replayBucketStart = getBucketStart(Number(cursorTimestamp), timeframe);
  const completedBars = baseBars.filter((bar) => Number(bar?.timestamp) < replayBucketStart);
  const futureBars = baseBars.filter((bar) => Number(bar?.timestamp) > replayBucketStart);
  const partialBar = aggregatePartialBar(sourceBars, replayBucketStart, Number(cursorTimestamp), timeframe);
  return partialBar ? [...completedBars, partialBar, ...futureBars] : baseBars;
}

export function parseReplayJumpTimestamp(value) {
  const formatted = formatTimeInput(value.trim());
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return { timestamp: null, formatted };

  const [, year, month, day, hour, minute] = match;
  const timestamp = Math.floor(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    ) / 1000
  );

  return { timestamp, formatted };
}

export function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

export function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
