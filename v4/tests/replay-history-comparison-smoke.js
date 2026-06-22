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
    clear() {
      data.clear();
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.window = { localStorage: globalThis.localStorage };

const {
  clearReplayHistory,
  getReplayHistory,
  normalizeReplayHistoryItem,
  saveReplayHistoryItem,
} = await import('../src/ui/replay-history-store.js');

const normalized = normalizeReplayHistoryItem({
  primary: { instrument: 'NQ', timeframe: 1, start: '2024-01-08', end: '2024-01-09' },
  replay: { enabled: true, cursorTimestamp: 1_704_896_400 },
  comparison: {
    enabled: true,
    instrument: 'es',
    timeframe: 240,
    syncMode: 'primary-time',
    layoutMode: 'floating',
    visibleWindow: { x: 10, y: 10, width: 40, height: 40 },
  },
});

assert.deepEqual(normalized.comparison, {
  enabled: true,
  viewId: 'comparison-window-1',
  instrument: 'ES',
  timeframe: 240,
  syncMode: 'primary-time',
  layoutMode: 'floating',
});
assert.equal(Object.hasOwn(normalized.comparison, 'visibleWindow'), false);

clearReplayHistory();
saveReplayHistoryItem({
  primary: { instrument: 'NQ', timeframe: 1, start: '2024-01-08', end: '2024-01-09' },
  replay: { enabled: true, cursorTimestamp: 1_704_896_400 },
  comparison: { enabled: false, instrument: 'ES', timeframe: 60 },
}, { now: 1_000 });
saveReplayHistoryItem({
  primary: { instrument: 'NQ', timeframe: 1, start: '2024-01-08', end: '2024-01-09' },
  replay: { enabled: true, cursorTimestamp: 1_704_896_400 },
  comparison: { enabled: true, instrument: 'ES', timeframe: 60 },
}, { now: 2_000 });

const history = getReplayHistory('NQ');
assert.equal(history.length, 2, 'comparison state should be part of the history identity');
assert.deepEqual(history.map((item) => item.comparison.enabled), [true, false]);

console.log('replay-history-comparison-smoke passed');
