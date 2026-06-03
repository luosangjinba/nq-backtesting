const BASE_ANCHOR_EPOCH = 946684800; // 2000-01-01 00:00 wall-clock anchor.
const FOUR_HOUR_ANCHOR_OFFSET = 7200; // Match backend 4H bars: 02:00/06:00/.../22:00.

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getUtcParts(timestamp) {
  const date = new Date(timestamp * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
  };
}

function formatUtcDay(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getTradingDaySessionStart(timestamp) {
  const parts = getUtcParts(timestamp);
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day, 18, 0, 0, 0));

  if (parts.hour < 18) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return Math.floor(date.getTime() / 1000);
}

export function getBucketStart(timestamp, timeframe) {
  const parsedTimestamp = toFiniteNumber(timestamp);
  const parsedTimeframe = toFiniteNumber(timeframe);
  if (parsedTimestamp === null || parsedTimeframe === null || parsedTimeframe <= 0) return null;

  if (parsedTimeframe === 1440) {
    return getTradingDaySessionStart(parsedTimestamp);
  }

  const tfSeconds = parsedTimeframe * 60;
  const anchor = BASE_ANCHOR_EPOCH + (parsedTimeframe === 240 ? FOUR_HOUR_ANCHOR_OFFSET : 0);
  return anchor + Math.floor((parsedTimestamp - anchor) / tfSeconds) * tfSeconds;
}

export function getBarChartTime(bar, timeframe) {
  if (!bar) return null;
  return Number(timeframe) === 1440 ? bar.tradingDay ?? null : bar.timestamp ?? null;
}

export function mapTimestampToChartTime(timestamp, timeframe, bars = []) {
  const parsedTimestamp = toFiniteNumber(timestamp);
  if (parsedTimestamp === null) return null;
  const parsedTimeframe = toFiniteNumber(timeframe);
  if (parsedTimeframe === null) return parsedTimestamp;

  const bucketStart = getBucketStart(parsedTimestamp, parsedTimeframe);
  if (bucketStart === null) return null;

  if (parsedTimeframe === 1440) {
    const exactBar = Array.isArray(bars)
      ? bars.find((bar) => Number(bar?.timestamp) === parsedTimestamp)
      : null;
    if (exactBar?.tradingDay) return exactBar.tradingDay;

    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }

  return bucketStart;
}

export function normalizeChartTime(time) {
  if (time === undefined || time === null) return null;
  if (typeof time === 'object' && time.year && time.month && time.day) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
  }
  return String(time);
}

export function findDisplayBarByTime(bars, time, timeframe) {
  if (!Array.isArray(bars) || time === undefined || time === null) return null;
  const target = normalizeChartTime(time);
  if (target === null) return null;
  return bars.find((bar) => normalizeChartTime(getBarChartTime(bar, timeframe)) === target) || null;
}

export function getDisplayBarIndex(bars, time, timeframe) {
  const bar = findDisplayBarByTime(bars, time, timeframe);
  return bar ? bars.indexOf(bar) : -1;
}
