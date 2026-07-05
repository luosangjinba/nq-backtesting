import { normalizeBars } from '../bar-data/bar-normalizer.js';

function normalizeTimeframeMinutes(value, fieldName = 'timeframe') {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error(`Display timeframe ${fieldName} must be a positive integer.`);
  }
  return minutes;
}

function normalizeCursorTimestamp(value) {
  if (value === null || value === undefined) return null;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Display timeframe cursorTimestamp must be finite.');
  }
  return timestamp;
}

function bucketStart(timestamp, timeframeMinutes) {
  const bucketSizeSeconds = timeframeMinutes * 60;
  return Math.floor(timestamp / bucketSizeSeconds) * bucketSizeSeconds;
}

function cloneBar(bar) {
  return { ...bar };
}

export function projectBarsToDisplayTimeframe({
  bars = [],
  cursorTimestamp = null,
  sourceTimeframe = 1,
  targetTimeframe = 1,
} = {}) {
  const source = normalizeTimeframeMinutes(sourceTimeframe, 'sourceTimeframe');
  const target = normalizeTimeframeMinutes(targetTimeframe, 'targetTimeframe');
  const cursor = normalizeCursorTimestamp(cursorTimestamp);
  const normalizedBars = normalizeBars(bars)
    .filter((bar) => cursor === null || bar.timestamp <= cursor)
    .sort((left, right) => left.timestamp - right.timestamp);

  if (target === source) {
    return Object.freeze(normalizedBars.map(cloneBar));
  }
  if (target < source || target % source !== 0) {
    throw new Error('Display timeframe targetTimeframe must be a multiple of sourceTimeframe.');
  }

  const buckets = new Map();
  normalizedBars.forEach((bar) => {
    const start = bucketStart(bar.timestamp, target);
    const existing = buckets.get(start);
    if (!existing) {
      buckets.set(start, {
        close: bar.close,
        high: bar.high,
        low: bar.low,
        open: bar.open,
        timestamp: start,
      });
      return;
    }
    existing.close = bar.close;
    existing.high = Math.max(existing.high, bar.high);
    existing.low = Math.min(existing.low, bar.low);
  });

  return Object.freeze([...buckets.values()].sort((left, right) => left.timestamp - right.timestamp));
}
