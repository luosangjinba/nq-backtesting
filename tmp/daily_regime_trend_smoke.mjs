import assert from 'node:assert/strict';
import {
  buildTrendRegimeByDate,
  getTrendRegimeForDailyRow,
} from '../v4/src/daily-regime/daily-regime-trend.js';
import { TREND_REGIMES } from '../v4/src/daily-regime/daily-regime-types.js';

assert.equal(
  getTrendRegimeForDailyRow({ close: 120, ema20: 110, ema50: 100 }),
  TREND_REGIMES.BULL_TREND
);
assert.equal(
  getTrendRegimeForDailyRow({ close: 80, ema20: 90, ema50: 100 }),
  TREND_REGIMES.BEAR_TREND
);
assert.equal(
  getTrendRegimeForDailyRow({ close: 100, ema20: 90, ema50: 110 }),
  TREND_REGIMES.RANGE
);
assert.equal(
  getTrendRegimeForDailyRow({ close: 100, ema20: 90, ema50: null }),
  TREND_REGIMES.UNKNOWN
);

const bars = Array.from({ length: 60 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 0, index + 1));
  return {
    tradingDay: date.toISOString().slice(0, 10),
    timestamp: Math.floor(date.getTime() / 1000),
    close: 100 + index,
  };
});

const trendByDate = buildTrendRegimeByDate(bars);
assert.equal(trendByDate.get('2024-01-10').trendRegime, TREND_REGIMES.UNKNOWN);
assert.equal(trendByDate.get('2024-02-29').trendRegime, TREND_REGIMES.BULL_TREND);
