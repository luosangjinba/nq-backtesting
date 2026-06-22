import assert from 'node:assert/strict';
import { getReplaySyncedComparisonBars } from '../src/comparison/comparison-replay-sync.js';

const htfBars = [
  { timestamp: 36000, open: 10, high: 20, low: 9, close: 15, volume: 10 },
  { timestamp: 39600, open: 15, high: 25, low: 12, close: 22, volume: 20 },
];

const sourceBars = [
  { timestamp: 36000, open: 10, high: 12, low: 9, close: 11, volume: 1 },
  { timestamp: 36060, open: 11, high: 13, low: 10, close: 12, volume: 2 },
  { timestamp: 36120, open: 12, high: 14, low: 11, close: 13, volume: 3 },
  { timestamp: 39600, open: 15, high: 16, low: 14, close: 16, volume: 4 },
];

const synced = getReplaySyncedComparisonBars({
  displayBars: htfBars,
  timeframe: 60,
  replayEnabled: true,
  cursorTimestamp: 36120,
  replaySourceBars: sourceBars,
  replaySourceRequestedRange: { startTs: 36000, endTs: 39600 },
});

assert.equal(synced.length, 1, 'HTF replay should not show future complete candle');
assert.deepEqual(synced[0], {
  timestamp: 36000,
  tradingDay: undefined,
  open: 10,
  high: 14,
  low: 9,
  close: 13,
  volume: 6,
});

const lowerTfSynced = getReplaySyncedComparisonBars({
  displayBars: sourceBars,
  timeframe: 1,
  replayEnabled: true,
  cursorTimestamp: 36120,
});
assert.deepEqual(lowerTfSynced.map((bar) => bar.timestamp), [36000, 36060, 36120]);

const full = getReplaySyncedComparisonBars({
  displayBars: htfBars,
  timeframe: 60,
  replayEnabled: false,
});
assert.equal(full.length, 2, 'Replay off should keep all comparison bars');

console.log('comparison-replay-sync-smoke passed');
