import { TREND_REGIMES, normalizeDailyRegime } from './daily-regime-types.js';
import { dateKeyFromBar } from '../utils.js';

export function getDailyClosesFromBars(bars = []) {
  const byDate = new Map();
  (Array.isArray(bars) ? bars : []).forEach((bar) => {
    const date = dateKeyFromBar(bar);
    const timestamp = Number(bar.timestamp);
    const close = Number(bar.close);
    if (!date || !Number.isFinite(timestamp) || !Number.isFinite(close)) return;
    const existing = byDate.get(date);
    if (!existing || timestamp >= existing.timestamp) {
      byDate.set(date, { date, timestamp, close });
    }
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function addEmaValues(rows = [], period) {
  const multiplier = 2 / (period + 1);
  let ema = null;
  let sum = 0;
  return rows.map((row, index) => {
    if (index < period) sum += row.close;
    if (index === period - 1) {
      ema = sum / period;
    } else if (index >= period && ema !== null) {
      ema = (row.close - ema) * multiplier + ema;
    }
    return {
      ...row,
      [`ema${period}`]: index >= period - 1 && ema !== null ? ema : null,
    };
  });
}

export function getTrendRegimeForDailyRow(row = {}) {
  const close = row.close === null || row.close === undefined || row.close === '' ? NaN : Number(row.close);
  const ema20 = row.ema20 === null || row.ema20 === undefined || row.ema20 === '' ? NaN : Number(row.ema20);
  const ema50 = row.ema50 === null || row.ema50 === undefined || row.ema50 === '' ? NaN : Number(row.ema50);
  if (![close, ema20, ema50].every(Number.isFinite)) return TREND_REGIMES.UNKNOWN;
  if (close > ema20 && ema20 > ema50) return TREND_REGIMES.BULL_TREND;
  if (close < ema20 && ema20 < ema50) return TREND_REGIMES.BEAR_TREND;
  return TREND_REGIMES.RANGE;
}

export function buildTrendRegimeByDate(bars = []) {
  const dailyCloses = getDailyClosesFromBars(bars);
  const withEma20 = addEmaValues(dailyCloses, 20);
  const withEma20And50 = addEmaValues(withEma20, 50);
  return new Map(
    withEma20And50.map((row) => [row.date, {
      trendRegime: getTrendRegimeForDailyRow(row),
      trendClose: row.close,
      trendEma20: row.ema20,
      trendEma50: row.ema50,
    }])
  );
}

export function applyTrendRegimes(regimes = [], bars = []) {
  const trendByDate = buildTrendRegimeByDate(bars);
  return (Array.isArray(regimes) ? regimes : []).map((regime) => {
    const trend = trendByDate.get(regime.date);
    return normalizeDailyRegime({
      ...regime,
      ...(trend || { trendRegime: TREND_REGIMES.UNKNOWN }),
    });
  });
}
