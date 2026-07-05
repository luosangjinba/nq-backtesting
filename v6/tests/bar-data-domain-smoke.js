import assert from 'node:assert/strict';
import { normalizeBars } from '../src/bar-data/bar-normalizer.js';
import { createBarWindowCache } from '../src/bar-data/bar-window-cache.js';
import {
  normalizeBarWindow,
  planBarWindow,
} from '../src/bar-data/bar-window.js';

const planned = planBarWindow({
  anchor: '2026-06-01T09:32:00.000Z',
  count: 3,
  direction: 'backward',
  instrument: 'nq',
  timeframe: 1,
}, { maxBarsPerWindow: 5 });

assert.deepEqual(planned, {
  anchor: '2026-06-01T09:32:00.000Z',
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:32',
  estimatedBars: 3,
  instrument: 'NQ',
  start: '2026-06-01 09:30',
  timeframe: 1,
});

assert.deepEqual(normalizeBarWindow({
  end: '2026-06-01T09:32:00.000Z',
  instrument: 'NQ',
  start: '2026-06-01T09:30:00.000Z',
  timeframe: 1,
}, { maxBarsPerWindow: 5 }), {
  bounded: true,
  end: '2026-06-01 09:32',
  estimatedBars: 3,
  instrument: 'NQ',
  start: '2026-06-01 09:30',
  timeframe: 1,
});

assert.throws(
  () => planBarWindow({
    anchor: '2026-06-01T09:32:00.000Z',
    count: 6,
    instrument: 'NQ',
    timeframe: 1,
  }, { maxBarsPerWindow: 5 }),
  /exceeds limit 5/
);

const bars = normalizeBars([
  { timestamp: 1780306320, open: '102', high: 103, low: 101, close: 102.5 },
  { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
  { time: '2026-06-01 09:31', open: 100.5, high: 102, low: 100, close: 101.5 },
  { time: '2026-06-01 09:31', open: 999, high: 999, low: 999, close: 999 },
]);
assert.deepEqual(bars.map((bar) => bar.timestamp), [1780306200, 1780306260, 1780306320]);
assert.equal(bars[1].open, 100.5);

const cache = createBarWindowCache({ maxBarsPerWindow: 5 });
const record = cache.put(planned, {
  bars,
  requestedRange: { startTs: 1780306200, endTs: 1780306320 },
  timing: { durationMs: 12.5 },
});
assert.equal(record.key, 'NQ|1|2026-06-01 09:30|2026-06-01 09:32');
assert.equal(record.cacheHit, false);
record.bars[0].close = 0;
assert.equal(cache.get(planned).bars[0].close, 100.5);

const covered = cache.get({
  anchor: '2026-06-01T09:31:00.000Z',
  count: 2,
  direction: 'forward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(covered.cacheHit, true);
assert.equal(covered.coveredByKey, record.key);
assert.deepEqual(covered.bars.map((bar) => bar.timestamp), [1780306260, 1780306320]);
assert.equal(cache.summary().barCount, 3);
assert.equal(cache.release(planned).released, true);
assert.equal(cache.summary().windowCount, 0);

console.log('v6 bar data domain smoke passed');
