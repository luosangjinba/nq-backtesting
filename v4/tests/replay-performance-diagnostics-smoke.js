import assert from 'node:assert/strict';

const localStorageState = new Map();
global.window = {
  location: { search: '' },
  localStorage: {
    getItem: (key) => localStorageState.get(key) || null,
    setItem: (key, value) => localStorageState.set(key, String(value)),
    removeItem: (key) => localStorageState.delete(key),
  },
};

const diagnostics = await import('../src/data/replay-performance-diagnostics.js');
const store = await import('../src/data/bar-store.js');

assert.equal(diagnostics.isReplayPerformanceDiagnosticsEnabled(), false);
assert.equal(typeof window.v4ReplayPerfDiagnostics.enable, 'function');

diagnostics.setReplayPerformanceDiagnosticsEnabled(true);
diagnostics.resetReplayPerformanceDiagnostics();

store.setBars(
  [
    { time: '2024-01-02 09:30', timestamp: 1704187800, open: 1, high: 2, low: 1, close: 2 },
    { time: '2024-01-02 09:31', timestamp: 1704187860, open: 2, high: 3, low: 2, close: 3 },
  ],
  '2024-01-02 09:30',
  '2024-01-02 09:31',
  1,
  null,
  { instrument: 'NQ' }
);

const snapshot = diagnostics.getReplayPerformanceDiagnosticsSnapshot();
assert.equal(snapshot.enabled, true);
assert.equal(snapshot.counters['bar-store:set-bars'], 1);
assert.equal(snapshot.events.length, 1);
assert.equal(snapshot.events[0].operation, 'setBars');
assert.equal(snapshot.events[0].instrument, 'NQ');
assert.equal(snapshot.events[0].barsCount, 2);
assert.equal(snapshot.events[0].displayBarsCount, 2);
assert.equal(Number.isFinite(snapshot.events[0].durationMs), true);

diagnostics.setReplayPerformanceDiagnosticsEnabled(false);
assert.equal(diagnostics.isReplayPerformanceDiagnosticsEnabled(), false);

console.log('replay performance diagnostics smoke passed');
