import assert from 'node:assert/strict';
import {
  makeTargetBarWindowKey,
  normalizeTargetBarWindow,
} from '../src/bar-data/target-bar-window.js';
import { createTargetBarWindowCache } from '../src/bar-data/target-bar-window-cache.js';

const eightHour = normalizeTargetBarWindow({
  end: '2026-06-02 00:00',
  instrument: 'nq',
  start: '2026-06-01 00:00',
  timeframe: '8H',
});

assert.deepEqual(eightHour, {
  bounded: true,
  bucketType: 'fixed-duration',
  dataKind: 'target-display',
  end: '2026-06-02 00:00',
  estimatedBars: 4,
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});
assert.equal(
  makeTargetBarWindowKey(eightHour),
  'target|NQ|8h|2026-06-01 00:00|2026-06-02 00:00'
);

assert.deepEqual(normalizeTargetBarWindow({
  end: '2026-06-06 18:00',
  instrument: 'NQ',
  start: '2026-06-01 18:00',
  timeframe: '1d',
}), {
  bounded: true,
  bucketType: 'session-aware',
  dataKind: 'target-display',
  end: '2026-06-06 18:00',
  estimatedBars: null,
  instrument: 'NQ',
  start: '2026-06-01 18:00',
  timeframe: '1D',
});

assert.throws(
  () => normalizeTargetBarWindow({
    end: '2026-08-01 00:00',
    instrument: 'NQ',
    start: '2026-06-01 00:00',
    timeframe: '1m',
  }, { maxBarsPerWindow: 10 }),
  /estimates/
);

const cache = createTargetBarWindowCache();
const putRecord = cache.put(eightHour, {
  bars: [
    { timestamp: 1780272000, open: 100 },
    { timestamp: 1780300800, open: 101 },
    { timestamp: 1780329600, open: 102 },
  ],
  requestedRange: { startTs: 1780272000, endTs: 1780358400 },
  timing: { source: 'v4-target-bars-api' },
});

assert.equal(putRecord.cacheHit, false);
assert.equal(putRecord.key, 'target|NQ|8h|2026-06-01 00:00|2026-06-02 00:00');
assert.deepEqual(cache.get(eightHour).bars.map((bar) => bar.open), [100, 101, 102]);

const covered = cache.get({
  end: '2026-06-01 08:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});

assert.equal(covered.cacheHit, true);
assert.equal(covered.coveredByKey, 'target|NQ|8h|2026-06-01 00:00|2026-06-02 00:00');
assert.deepEqual(covered.bars.map((bar) => bar.open), [100, 101]);
assert.deepEqual(cache.summary(), {
  barCount: 3,
  dataKind: 'target-display',
  keys: ['target|NQ|8h|2026-06-01 00:00|2026-06-02 00:00'],
  windowCount: 1,
});

assert.deepEqual(cache.release(eightHour), {
  key: 'target|NQ|8h|2026-06-01 00:00|2026-06-02 00:00',
  released: true,
});
assert.equal(cache.summary().windowCount, 0);

console.log('v6 target bar window cache step282 smoke passed');
