import assert from 'node:assert/strict';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

const storage = createMemoryStorage();
globalThis.localStorage = storage;
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  localStorage: storage,
};

const calendar = await import('../src/ui/calendar-navigator.js');

function makeFetchRecorder(responseFactory) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return responseFactory(url, options, calls.length);
      },
    };
  };
  return { calls, fetchImpl };
}

const storageKey = 'v4.dateRangeHistory';

storage.setItem(storageKey, JSON.stringify([
  { start: '2026-06-01 00:00', end: '2026-06-05 23:59', timeframe: 1, loadedAt: 1 },
]));

let recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: calendar.getDateRangeHistoryWorkspaceDomain(),
  payload: {
    version: 1,
    savedAt: 1780306200001,
    ranges: [
      { start: '2026-06-10 00:00', end: '2026-06-12 23:59', timeframe: 60, loadedAt: 2 },
    ],
  },
}));
await calendar.syncRangeHistoryFromServer({ fetchImpl: recorder.fetchImpl });
let history = calendar.getRangeHistory();
assert.equal(history.length, 1);
assert.equal(history[0].start, '2026-06-10 00:00');
assert.equal(history[0].timeframe, 60);
assert.match(recorder.calls[0].url, /\/v4\/workspace\?domain=date-range-history$/);

storage.setItem(storageKey, JSON.stringify([
  { start: '2026-07-01 00:00', end: '2026-07-02 23:59', timeframe: 5, loadedAt: 3 },
]));
recorder = makeFetchRecorder((url, options) => {
  if (options.method === 'PUT') return { ok: true, found: true };
  return { ok: true, found: false, payload: null };
});
await calendar.syncRangeHistoryFromServer({ fetchImpl: recorder.fetchImpl });
const putCall = recorder.calls.find((call) => call.options.method === 'PUT');
assert.ok(putCall);
const body = JSON.parse(putCall.options.body);
assert.equal(body.domain, calendar.getDateRangeHistoryWorkspaceDomain());
assert.equal(body.instrument, null);
assert.equal(body.payload.ranges[0].start, '2026-07-01 00:00');
assert.equal(body.payload.ranges[0].timeframe, 5);

console.log('date range history workspace smoke passed');
