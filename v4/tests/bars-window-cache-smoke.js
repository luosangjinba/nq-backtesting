import assert from 'node:assert/strict';
import {
  clearBarsWindowCache,
  configureBarsWindowCache,
  fetchBarsWindowCached,
  getBarsWindowCacheKey,
  getBarsWindowCacheStats,
} from '../src/data/bars-window-cache.js';

clearBarsWindowCache();

assert.equal(
  getBarsWindowCacheKey({
    instrument: 'nq',
    timeframe: 1,
    start: '2012-01-01 00:00',
    end: '2012-01-15 00:00',
  }),
  'NQ|1|2012-01-01 00:00|2012-01-15 00:00'
);

let calls = 0;
const first = await fetchBarsWindowCached({
  instrument: 'NQ',
  timeframe: 1,
  start: '2012-01-01 00:00',
  end: '2012-01-15 00:00',
  load: async () => {
    calls += 1;
    return {
      bars: [{ timestamp: 1, close: 100 }],
      requestedRange: { startTs: 1, endTs: 1 },
    };
  },
});
assert.equal(first.cacheHit, false);
assert.equal(calls, 1);

first.payload.bars[0].close = 200;
const second = await fetchBarsWindowCached({
  instrument: 'NQ',
  timeframe: 1,
  start: '2012-01-01 00:00',
  end: '2012-01-15 00:00',
  load: async () => {
    calls += 1;
    return { bars: [], requestedRange: null };
  },
});
assert.equal(second.cacheHit, true);
assert.equal(second.payload.bars[0].close, 100, 'cached payload should be cloned');
assert.equal(calls, 1);

clearBarsWindowCache();
let inflightCalls = 0;
const pending = [
  fetchBarsWindowCached({
    instrument: 'ES',
    timeframe: 1,
    start: '2012-01-01 00:00',
    end: '2012-01-15 00:00',
    load: async () => {
      inflightCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { bars: [{ timestamp: 2 }], requestedRange: null };
    },
  }),
  fetchBarsWindowCached({
    instrument: 'ES',
    timeframe: 1,
    start: '2012-01-01 00:00',
    end: '2012-01-15 00:00',
    load: async () => {
      inflightCalls += 1;
      return { bars: [], requestedRange: null };
    },
  }),
];
const [left, right] = await Promise.all(pending);
assert.equal(inflightCalls, 1);
assert.equal(left.cacheHit, false);
assert.equal(right.cacheHit, true);

clearBarsWindowCache();
configureBarsWindowCache({ maxEntries: 2 });
for (const index of [1, 2, 3]) {
  await fetchBarsWindowCached({
    instrument: 'NQ',
    timeframe: 1,
    start: `2012-01-${String(index).padStart(2, '0')} 00:00`,
    end: `2012-01-${String(index + 1).padStart(2, '0')} 00:00`,
    load: async () => ({ bars: [{ timestamp: index }], requestedRange: null }),
  });
}
const stats = getBarsWindowCacheStats();
assert.equal(stats.entries, 2);
assert.equal(stats.keys.some((key) => key.includes('2012-01-01')), false, 'oldest entry should be evicted');

console.log('bars window cache smoke passed');
