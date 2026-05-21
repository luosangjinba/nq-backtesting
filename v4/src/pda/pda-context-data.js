// PDA-only data fetches. These requests do not update the chart display store.

import { fetchBars } from '../api.js';

const dayCache = new Map();

function getUtcParts(timestamp) {
  const date = new Date(timestamp * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
  };
}

function formatDateTimeUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getTradingDayDate(timestamp) {
  const parts = getUtcParts(timestamp);
  const date = new Date(Date.UTC(parts.year, parts.month, parts.day));

  if (parts.hour >= 18) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

export function getTradingDayRange(timestamp) {
  const tradingDay = getTradingDayDate(timestamp);
  const start = new Date(tradingDay);
  start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(18, 0, 0, 0);

  const end = new Date(tradingDay);
  end.setUTCHours(16, 59, 0, 0);

  return {
    tradingDay: tradingDay.toISOString().slice(0, 10),
    start: formatDateTimeUtc(start),
    end: formatDateTimeUtc(end),
  };
}

function filterRequestedBars(result) {
  const { bars, requestedRange } = result;
  if (!requestedRange) return bars;

  return bars.filter(
    (bar) => bar.timestamp >= requestedRange.startTs && bar.timestamp <= requestedRange.endTs
  );
}

export async function fetchTradingDayBars(timestamp, timeframe, instrument = 'NQ') {
  const range = getTradingDayRange(timestamp);
  const key = `${instrument}:${timeframe}:${range.tradingDay}`;

  if (dayCache.has(key)) {
    return dayCache.get(key);
  }

  const result = await fetchBars(range.start, range.end, timeframe, instrument);
  const bars = filterRequestedBars(result);
  dayCache.set(key, bars);
  return bars;
}

export function clearPdaContextDataCache() {
  dayCache.clear();
}
