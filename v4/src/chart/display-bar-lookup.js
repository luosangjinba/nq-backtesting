import {
  getBarChartTime,
  mapTimestampToChartTime,
  normalizeChartTime,
} from './time-projection.js';

const MAX_LOOKUPS = 8;
const cachedLookups = new Map();

function getBarsSignature(bars, timeframe) {
  if (!Array.isArray(bars) || !bars.length) return `${timeframe}:empty`;
  const first = bars[0]?.timestamp ?? bars[0]?.tradingDay ?? '';
  const last = bars[bars.length - 1]?.timestamp ?? bars[bars.length - 1]?.tradingDay ?? '';
  return `${timeframe}:${bars.length}:${first}:${last}`;
}

function buildLookup(bars, timeframe) {
  const chartTimeToBar = new Map();
  const timestampToBar = new Map();

  (Array.isArray(bars) ? bars : []).forEach((bar) => {
    const chartTime = normalizeChartTime(getBarChartTime(bar, timeframe));
    if (chartTime !== null && !chartTimeToBar.has(chartTime)) {
      chartTimeToBar.set(chartTime, bar);
    }

    const timestamp = Number(bar?.timestamp);
    if (Number.isFinite(timestamp) && !timestampToBar.has(timestamp)) {
      timestampToBar.set(timestamp, bar);
    }
  });

  return { chartTimeToBar, timestampToBar };
}

export function getDisplayBarLookup(bars, timeframe) {
  const signature = getBarsSignature(bars, timeframe);
  const cached = cachedLookups.get(signature);
  if (cached) return cached;

  const lookup = buildLookup(bars, timeframe);
  cachedLookups.set(signature, lookup);
  if (cachedLookups.size > MAX_LOOKUPS) {
    const oldestKey = cachedLookups.keys().next().value;
    cachedLookups.delete(oldestKey);
  }
  return lookup;
}

export function findDisplayBarFast(bars, time, timeframe) {
  if (time === undefined || time === null) return null;
  const key = normalizeChartTime(time);
  if (key === null) return null;
  return getDisplayBarLookup(bars, timeframe).chartTimeToBar.get(key) || null;
}

export function resolveExistingChartTimeFast(timestamp, targetTimeframe, targetBars) {
  const chartTime = mapTimestampToChartTime(timestamp, targetTimeframe, targetBars);
  if (chartTime === null) return null;
  const targetBar = findDisplayBarFast(targetBars, chartTime, targetTimeframe);
  return targetBar ? getBarChartTime(targetBar, targetTimeframe) : null;
}
