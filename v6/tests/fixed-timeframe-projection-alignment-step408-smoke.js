import assert from 'node:assert/strict';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';

const firstTimestamp = Date.parse('2026-05-06T04:00:00.000Z') / 1000;
const bars = Array.from({ length: 16 * 60 }, (_, index) => ({
  close: 28_000 + index + 0.25,
  high: 28_001 + index,
  low: 27_999 + index,
  open: 28_000 + index,
  timestamp: firstTimestamp + (index * 60),
}));

function timestamps(projection) {
  return projection.bars.map((bar) => Number(bar.timestamp ?? bar.time));
}

const hourly = projectSourceBarsToChartData({
  bars,
  sessionStartTimestamp: Date.parse('2026-05-06T09:30:00.000Z') / 1000,
  sourceTimeframe: 1,
  targetTimeframe: 60,
});
assert.equal(timestamps(hourly).every((timestamp) => timestamp % 3600 === 0), true);

const fourHourly = projectSourceBarsToChartData({
  bars,
  sessionStartTimestamp: Date.parse('2026-05-06T09:30:00.000Z') / 1000,
  sourceTimeframe: 1,
  targetTimeframe: 240,
});
assert.equal(timestamps(fourHourly).every((timestamp) => timestamp % (4 * 3600) === 2 * 3600), true);
assert.deepEqual(
  timestamps(fourHourly).map((timestamp) => new Date(timestamp * 1000).toISOString().slice(11, 16)),
  ['02:00', '06:00', '10:00', '14:00', '18:00'],
);

const goToFragment = projectSourceBarsToChartData({
  bars: bars.filter((bar) => bar.timestamp >= Date.parse('2026-05-06T09:31:00.000Z') / 1000),
  cursorTimestamp: Date.parse('2026-05-06T19:00:00.000Z') / 1000,
  sessionStartTimestamp: Date.parse('2026-05-01T09:30:00.000Z') / 1000,
  sourceTimeframe: 1,
  targetTimeframe: 240,
});
assert.deepEqual(
  timestamps(goToFragment).map((timestamp) => new Date(timestamp * 1000).toISOString().slice(11, 16)),
  ['06:00', '10:00', '14:00', '18:00'],
  'a Go-to fragment must retain the same canonical 4h bucket grid as target history',
);

console.log('V6 fixed timeframe projection alignment Step 408 smoke passed.');
