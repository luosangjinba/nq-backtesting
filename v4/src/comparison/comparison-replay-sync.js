import { getBucketStart } from '../chart/time-projection.js';
import { dateKeyFromTimestamp } from '../utils.js';

export function filterBarsToRequestedRange(bars = [], requestedRange = null) {
  if (!requestedRange || !Array.isArray(bars) || bars.length === 0) return Array.isArray(bars) ? [...bars] : [];
  const { startTs, endTs } = requestedRange;
  return bars.filter((bar) => Number(bar?.timestamp) >= startTs && Number(bar?.timestamp) <= endTs);
}

export function aggregatePartialReplayBar(sourceBars, bucketStart, cursorTimestamp, timeframe) {
  const bucketEnd = bucketStart + timeframe * 60;
  const bars = (Array.isArray(sourceBars) ? sourceBars : []).filter((bar) => (
    Number(bar?.timestamp) >= bucketStart &&
    Number(bar?.timestamp) <= cursorTimestamp &&
    Number(bar?.timestamp) < bucketEnd
  ));
  if (!bars.length) return null;

  return bars.reduce((partial, bar, index) => {
    if (index === 0) {
      return {
        timestamp: bucketStart,
        tradingDay: timeframe === 1440 ? dateKeyFromTimestamp(bucketStart + 24 * 60 * 60) : bar.tradingDay,
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

export function getReplaySyncedComparisonBars({
  displayBars = [],
  timeframe,
  replayEnabled = false,
  cursorTimestamp = null,
  replaySourceBars = [],
  replaySourceRequestedRange = null,
} = {}) {
  if (!replayEnabled || cursorTimestamp === null) return Array.isArray(displayBars) ? [...displayBars] : [];

  const parsedCursor = Number(cursorTimestamp);
  if (!Number.isFinite(parsedCursor)) return [];
  const parsedTimeframe = Number(timeframe);
  if (!Number.isFinite(parsedTimeframe) || parsedTimeframe <= 0) return [];

  if (parsedTimeframe > 1) {
    const sourceBars = filterBarsToRequestedRange(replaySourceBars, replaySourceRequestedRange);
    if (sourceBars.length) {
      const replayBucketStart = getBucketStart(parsedCursor, parsedTimeframe);
      const completedBars = displayBars.filter((bar) => Number(bar?.timestamp) < replayBucketStart);
      const partialBar = aggregatePartialReplayBar(sourceBars, replayBucketStart, parsedCursor, parsedTimeframe);
      return partialBar ? [...completedBars, partialBar] : completedBars;
    }
  }

  const replayBucketStart = getBucketStart(parsedCursor, parsedTimeframe);
  let matchedIndex = -1;
  for (let index = 0; index < displayBars.length; index += 1) {
    const barTimestamp = Number(displayBars[index]?.timestamp);
    if (!Number.isFinite(barTimestamp)) continue;
    const barBucketStart = getBucketStart(barTimestamp, parsedTimeframe);
    if (barBucketStart > replayBucketStart) break;
    matchedIndex = index;
  }
  if (matchedIndex < 0) return [];
  return displayBars.slice(0, matchedIndex + 1);
}
