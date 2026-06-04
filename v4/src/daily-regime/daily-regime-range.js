import { RANGE_REGIMES, normalizeDailyRegime } from './daily-regime-types.js';
import { getDailyClosesFromBars } from './daily-regime-trend.js';

function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function dateKeyFromBar(bar = {}) {
  const tradingDay = String(bar.tradingDay || bar.trading_day || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(tradingDay)) return tradingDay;
  return dateKeyFromTimestamp(bar.timestamp);
}

export function getDailyRangeRowsFromBars(bars = []) {
  const closeByDate = new Map(getDailyClosesFromBars(bars).map((row) => [row.date, row]));
  const byDate = new Map();
  (Array.isArray(bars) ? bars : []).forEach((bar) => {
    const date = dateKeyFromBar(bar);
    const high = Number(bar.high);
    const low = Number(bar.low);
    if (!date || !Number.isFinite(high) || !Number.isFinite(low)) return;
    const existing = byDate.get(date);
    byDate.set(date, {
      date,
      high: existing ? Math.max(existing.high, high) : high,
      low: existing ? Math.min(existing.low, low) : low,
    });
  });

  return Array.from(byDate.values())
    .map((row) => ({
      ...row,
      close: closeByDate.get(row.date)?.close ?? null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function average(values = []) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function addAtr20Values(rows = []) {
  const trueRanges = [];
  return rows.map((row, index) => {
    const previousClose = index > 0 ? rows[index - 1].close : null;
    const high = Number(row.high);
    const low = Number(row.low);
    const close = Number(row.close);
    if (![high, low, close].every(Number.isFinite)) {
      trueRanges.push(null);
      return { ...row, dayRange: null, trueRange: null, atr20: null, rangeAtrRatio: null };
    }

    const dayRange = high - low;
    const trueRange = Number.isFinite(Number(previousClose))
      ? Math.max(dayRange, Math.abs(high - previousClose), Math.abs(low - previousClose))
      : dayRange;
    trueRanges.push(trueRange);
    const recent = trueRanges.slice(Math.max(0, index - 19), index + 1).filter(Number.isFinite);
    const atr20 = recent.length >= 20 ? average(recent) : null;
    return {
      ...row,
      dayRange,
      trueRange,
      atr20,
      rangeAtrRatio: atr20 && atr20 > 0 ? dayRange / atr20 : null,
    };
  });
}

export function getRangeRegimeForRatio(rangeAtrRatio) {
  const ratio = rangeAtrRatio === null || rangeAtrRatio === undefined || rangeAtrRatio === ''
    ? NaN
    : Number(rangeAtrRatio);
  if (!Number.isFinite(ratio)) return RANGE_REGIMES.UNKNOWN;
  if (ratio < 0.8) return RANGE_REGIMES.SMALL_RANGE;
  if (ratio > 1.2) return RANGE_REGIMES.LARGE_RANGE;
  return RANGE_REGIMES.NORMAL_RANGE;
}

export function buildRangeRegimeByDate(bars = []) {
  return new Map(
    addAtr20Values(getDailyRangeRowsFromBars(bars)).map((row) => [row.date, {
      rangeRegime: getRangeRegimeForRatio(row.rangeAtrRatio),
      dayRange: row.dayRange,
      atr20: row.atr20,
      rangeAtrRatio: row.rangeAtrRatio,
    }])
  );
}

export function applyRangeRegimes(regimes = [], bars = []) {
  const rangeByDate = buildRangeRegimeByDate(bars);
  return (Array.isArray(regimes) ? regimes : []).map((regime) => {
    const range = rangeByDate.get(regime.date);
    return normalizeDailyRegime({
      ...regime,
      ...(range || { rangeRegime: RANGE_REGIMES.UNKNOWN }),
    });
  });
}
