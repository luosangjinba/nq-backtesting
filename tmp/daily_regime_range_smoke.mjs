import assert from 'node:assert/strict';
import {
  buildRangeRegimeByDate,
  getRangeRegimeForRatio,
} from '../v4/src/daily-regime/daily-regime-range.js';
import { RANGE_REGIMES } from '../v4/src/daily-regime/daily-regime-types.js';

assert.equal(getRangeRegimeForRatio(0.79), RANGE_REGIMES.SMALL_RANGE);
assert.equal(getRangeRegimeForRatio(0.8), RANGE_REGIMES.NORMAL_RANGE);
assert.equal(getRangeRegimeForRatio(1.2), RANGE_REGIMES.NORMAL_RANGE);
assert.equal(getRangeRegimeForRatio(1.21), RANGE_REGIMES.LARGE_RANGE);
assert.equal(getRangeRegimeForRatio(null), RANGE_REGIMES.UNKNOWN);

const bars = Array.from({ length: 22 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 0, index + 1));
  const dayRange = index === 21 ? 30 : 10;
  return {
    tradingDay: date.toISOString().slice(0, 10),
    timestamp: Math.floor(date.getTime() / 1000),
    high: 100 + dayRange,
    low: 100,
    close: 105,
  };
});

const rangeByDate = buildRangeRegimeByDate(bars);
assert.equal(rangeByDate.get('2024-01-10').rangeRegime, RANGE_REGIMES.UNKNOWN);
assert.equal(rangeByDate.get('2024-01-22').rangeRegime, RANGE_REGIMES.LARGE_RANGE);
assert.ok(rangeByDate.get('2024-01-22').rangeAtrRatio > 1.2);
