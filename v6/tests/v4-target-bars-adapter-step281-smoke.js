import assert from 'node:assert/strict';
import {
  buildV4TargetBarsUrl,
  fetchV4TargetBars,
} from '../src/bar-data/v4-target-bars-adapter.js';

const window = {
  end: '2026-06-02 18:00',
  instrument: 'NQ',
  start: '2026-06-01 18:00',
  timeframe: '1d',
};

assert.equal(
  buildV4TargetBarsUrl(window, { apiBase: 'http://127.0.0.1:8766' }),
  'http://127.0.0.1:8766/v4/target_bars?end=2026-06-02+18%3A00&instrument=NQ&start=2026-06-01+18%3A00&tf=1D'
);

const timing = [100, 125, 130];
const result = await fetchV4TargetBars({
  end: '2026-06-01 16:00',
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8H',
}, {
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8766/v4/target_bars?end=2026-06-01+16%3A00&instrument=NQ&start=2026-06-01+00%3A00&tf=8h');
    assert.deepEqual(options, { headers: { Accept: 'application/json' } });
    return {
      ok: true,
      json: async () => ({
        bars: [
          {
            close: 105,
            high: 110,
            low: 90,
            open: 100,
            timestamp: 1780272000,
            timeframe: '8h',
          },
        ],
        cacheHit: true,
        requestedRange: {
          endTs: 1780329600,
          startTs: 1780272000,
        },
        targetTimeframe: '8h',
      }),
    };
  },
  now: () => timing.shift(),
});

assert.deepEqual(result, {
  bars: [
    {
      close: 105,
      high: 110,
      low: 90,
      open: 100,
      timestamp: 1780272000,
      timeframe: '8h',
    },
  ],
  cacheHit: true,
  requestedRange: {
    endTs: 1780329600,
    startTs: 1780272000,
  },
  targetTimeframe: '8h',
  timing: {
    durationMs: 30,
    parseMs: 5,
    requestMs: 25,
    source: 'v4-target-bars-api',
  },
  url: 'http://127.0.0.1:8766/v4/target_bars?end=2026-06-01+16%3A00&instrument=NQ&start=2026-06-01+00%3A00&tf=8h',
});

await assert.rejects(
  () => fetchV4TargetBars(window, {
    fetchImpl: async () => ({
      json: async () => ({ error: 'bad target timeframe' }),
      ok: false,
      status: 400,
    }),
  }),
  /bad target timeframe/
);

console.log('v6 v4 target bars adapter step281 smoke passed');
