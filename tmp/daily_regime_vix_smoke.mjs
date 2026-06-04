import assert from 'node:assert/strict';
import {
  buildVixDailyRegimes,
  parseDailyTrendRangeCsv,
  parseVixDailyCsv,
} from '../v4/src/daily-regime/daily-regime-vix-loader.js';
import { VIX_BUCKETS } from '../v4/src/daily-regime/daily-regime-types.js';

const csv = [
  'DATE,OPEN,HIGH,LOW,CLOSE',
  '2024-10-01,12,12,12,12.99',
  '2024-10-02,18,18,18,18.42',
  '2024-10-03,31,31,31,31.50',
].join('\n');

const byDate = parseVixDailyCsv(csv);
assert.equal(byDate.size, 3);
assert.equal(byDate.get('2024-10-02'), 18.42);

const regimes = buildVixDailyRegimes(byDate, { dateFrom: '2024-10-02', dateTo: '2024-10-03' }, 'ES');
assert.equal(regimes.length, 2);
assert.equal(regimes[0].date, '2024-10-02');
assert.equal(regimes[0].instrument, 'ES');
assert.equal(regimes[0].vixBucket, VIX_BUCKETS.MEDIUM);
assert.equal(regimes[1].vixBucket, VIX_BUCKETS.EXTREME_HIGH);

const trendRange = parseDailyTrendRangeCsv([
  'date,instrument,trendClose,trendEma20,trendEma50,trendRegime,dayRange,atr20,rangeAtrRatio,rangeRegime',
  '2024-10-02,NQ,20123.50,20000.100000,19800.200000,bull_trend,350.25,220.500000,1.588435,large_range',
].join('\n'));
assert.equal(trendRange.get('2024-10-02').trendRegime, 'bull_trend');
assert.equal(trendRange.get('2024-10-02').rangeRegime, 'large_range');
assert.equal(trendRange.get('2024-10-02').rangeAtrRatio, '1.588435');
