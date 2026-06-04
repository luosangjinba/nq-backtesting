import assert from 'node:assert/strict';
import {
  EVENT_TAGS,
  RANGE_REGIMES,
  TREND_REGIMES,
  VIX_BUCKETS,
  VOLATILITY_REGIMES,
  getDailyRegimeIdentity,
  getDailyRegimeSummary,
  getVixBucketForClose,
  normalizeDailyRegime,
} from '../v4/src/daily-regime/daily-regime-types.js';

assert.equal(getVixBucketForClose(12.99), VIX_BUCKETS.EXTREME_LOW);
assert.equal(getVixBucketForClose(13), VIX_BUCKETS.LOW);
assert.equal(getVixBucketForClose(16.99), VIX_BUCKETS.LOW);
assert.equal(getVixBucketForClose(17), VIX_BUCKETS.MEDIUM);
assert.equal(getVixBucketForClose(21.99), VIX_BUCKETS.MEDIUM);
assert.equal(getVixBucketForClose(22), VIX_BUCKETS.HIGH);
assert.equal(getVixBucketForClose(29.99), VIX_BUCKETS.HIGH);
assert.equal(getVixBucketForClose(30), VIX_BUCKETS.EXTREME_HIGH);
assert.equal(getVixBucketForClose(''), VIX_BUCKETS.NA);

const normalized = normalizeDailyRegime({
  date: '2024-10-02',
  instrument: 'nq',
  vixClose: '18.42',
  trendRegime: TREND_REGIMES.BULL_TREND,
  rangeRegime: RANGE_REGIMES.LARGE_RANGE,
  rangeAtrRatio: '1.59',
  eventTags: ['fomc', 'CPI', 'fomc'],
});

assert.equal(normalized.date, '2024-10-02');
assert.equal(normalized.instrument, 'NQ');
assert.equal(normalized.vixClose, 18.42);
assert.equal(normalized.vixBucket, VIX_BUCKETS.MEDIUM);
assert.equal(normalized.volatilityRegime, VOLATILITY_REGIMES.VIX_MEDIUM);
assert.equal(normalized.rangeAtrRatio, 1.59);
assert.deepEqual(normalized.eventTags, [EVENT_TAGS.FOMC, EVENT_TAGS.CPI]);
assert.equal(getDailyRegimeIdentity(normalized), '2024-10-02|NQ');

const missing = normalizeDailyRegime({ date: 'bad-date', eventTags: [] });
assert.equal(missing.date, '');
assert.equal(missing.instrument, 'NQ');
assert.equal(missing.volatilityRegime, VOLATILITY_REGIMES.UNKNOWN);
assert.equal(missing.vixClose, null);
assert.equal(missing.vixBucket, VIX_BUCKETS.NA);
assert.equal(missing.trendRegime, TREND_REGIMES.UNKNOWN);
assert.equal(missing.rangeRegime, RANGE_REGIMES.UNKNOWN);
assert.deepEqual(missing.eventTags, [EVENT_TAGS.UNKNOWN]);

assert.equal(
  getDailyRegimeSummary(normalized),
  'VIX: Medium 18.42 | Trend: bull_trend | Range: large_range 1.59 ATR | Events: FOMC, CPI'
);
