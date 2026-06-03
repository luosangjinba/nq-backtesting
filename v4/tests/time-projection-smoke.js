import {
  findDisplayBarByTime,
  getBarChartTime,
  getBucketStart,
  getDisplayBarIndex,
  normalizeChartTime,
} from '../src/chart/time-projection.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function timestamp(value) {
  return Math.floor(Date.parse(`${value}Z`) / 1000);
}

const intradayBar = { timestamp: timestamp('2012-01-03T09:30:00'), tradingDay: '2012-01-03' };
const dailyBar = { timestamp: timestamp('2012-01-03T18:00:00'), tradingDay: '2012-01-04' };

assert(getBarChartTime(intradayBar, 1) === intradayBar.timestamp, '1M bars should use timestamp');
assert(getBarChartTime(intradayBar, 5) === intradayBar.timestamp, '5M bars should use timestamp');
assert(getBarChartTime(intradayBar, 60) === intradayBar.timestamp, '1H bars should use timestamp');
assert(getBarChartTime(dailyBar, 1440) === '2012-01-04', 'D bars should use tradingDay');

assert(
  getBucketStart(timestamp('2012-01-03T03:30:00'), 240) === timestamp('2012-01-03T02:00:00'),
  '4H bucket should align to 02:00/06:00/...'
);
assert(
  getBucketStart(timestamp('2012-01-03T17:30:00'), 1440) === timestamp('2012-01-02T18:00:00'),
  'daily bucket before 18:00 should anchor to previous 18:00'
);
assert(
  getBucketStart(timestamp('2012-01-03T18:30:00'), 1440) === timestamp('2012-01-03T18:00:00'),
  'daily bucket after 18:00 should anchor to same-day 18:00'
);

assert(normalizeChartTime({ year: 2012, month: 1, day: 4 }) === '2012-01-04', 'date objects normalize to YYYY-MM-DD');
assert(normalizeChartTime(null) === null, 'null chart time remains null');
assert(getBucketStart('bad', 60) === null, 'invalid timestamp returns null bucket');
assert(getDisplayBarIndex([], 123, 1) === -1, 'missing bars return -1 index');

const bars = [
  { timestamp: timestamp('2012-01-03T09:30:00'), tradingDay: '2012-01-03' },
  { timestamp: timestamp('2012-01-03T09:31:00'), tradingDay: '2012-01-03' },
];

assert(findDisplayBarByTime(bars, bars[1].timestamp, 1) === bars[1], 'find intraday bar by timestamp');
assert(getDisplayBarIndex(bars, bars[0].timestamp, 1) === 0, 'get intraday bar index');

console.log('time projection smoke ok');
