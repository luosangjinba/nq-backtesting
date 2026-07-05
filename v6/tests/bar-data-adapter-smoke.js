import assert from 'node:assert/strict';
import {
  buildV4BarsUrl,
  fetchV4Bars,
  resolveV4BarsApiBase,
} from '../src/bar-data/v4-bars-adapter.js';

const window = {
  end: '2026-06-01 09:32',
  instrument: 'NQ',
  start: '2026-06-01 09:30',
  timeframe: 1,
};

assert.equal(
  resolveV4BarsApiBase({ hostname: '127.0.0.1', protocol: 'http:' }),
  'http://127.0.0.1:8766'
);
assert.equal(
  resolveV4BarsApiBase({ hostname: 'example.com', protocol: 'https:' }),
  ''
);

const url = buildV4BarsUrl(window, { apiBase: 'http://127.0.0.1:8766' });
assert.equal(
  url,
  'http://127.0.0.1:8766/v4/bars?end=2026-06-01+09%3A32&instrument=NQ&start=2026-06-01+09%3A30&tf=1'
);

const calls = [];
let clock = 100;
const result = await fetchV4Bars(window, {
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (requestUrl, options) => {
    calls.push({ options, url: requestUrl });
    clock = 115;
    return {
      ok: true,
      async json() {
        clock = 123;
        return {
          bars: [{ timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 }],
          requestedRange: { startTs: 1780306200, endTs: 1780306320 },
        };
      },
    };
  },
  now: () => clock,
});

assert.equal(calls.length, 1);
assert.equal(calls[0].url, url);
assert.equal(calls[0].options.headers.Accept, 'application/json');
assert.deepEqual(result.bars, [
  { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
]);
assert.deepEqual(result.requestedRange, { startTs: 1780306200, endTs: 1780306320 });
assert.deepEqual(result.timing, {
  durationMs: 23,
  parseMs: 8,
  requestMs: 15,
  source: 'v4-bars-api',
});

await assert.rejects(
  () => fetchV4Bars(window, {
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      async json() {
        return { error: 'bad range' };
      },
    }),
    now: () => 0,
  }),
  /bad range/
);

console.log('v6 bar data adapter smoke passed');
