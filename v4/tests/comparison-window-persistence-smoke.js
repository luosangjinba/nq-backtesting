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
    clear() {
      data.clear();
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.window = {
  localStorage: globalThis.localStorage,
  setTimeout,
  clearTimeout,
  addEventListener() {},
};

const {
  getComparisonViewDescriptor,
  setComparisonInstrument,
  setComparisonOverlaySyncMode,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} = await import('../src/comparison/comparison-window-store.js');
const {
  getComparisonWorkspaceStorageKey,
  readComparisonWorkspaceState,
  restoreComparisonWorkspaceState,
  saveComparisonWorkspaceState,
  serializeComparisonWorkspaceState,
} = await import('../src/comparison/comparison-window-persistence.js');

setComparisonWindowEnabled(true);
setComparisonInstrument('NQ');
setComparisonTimeframe(240);
setComparisonOverlaySyncMode('sync');
updateComparisonVisibleWindow({ x: 12, y: 14, width: 55, height: 38 });

const snapshot = saveComparisonWorkspaceState();
assert.equal(snapshot.enabled, true);
assert.equal(snapshot.descriptor.overlaySyncMode, 'sync');
assert.deepEqual(snapshot.descriptor.visibleWindow, { x: 12, y: 14, width: 55, height: 38 });

const raw = globalThis.localStorage.getItem(getComparisonWorkspaceStorageKey());
assert.ok(raw.includes('"instrument":"NQ"'));
assert.equal(raw.includes('"bars"'), false, 'workspace persistence must not store candle data');

setComparisonWindowEnabled(false);
setComparisonInstrument('ES');
setComparisonTimeframe(60);
setComparisonOverlaySyncMode('no-sync');
updateComparisonVisibleWindow({ x: 18, y: 10, width: 48, height: 46 });

const restored = restoreComparisonWorkspaceState(readComparisonWorkspaceState());
const descriptor = getComparisonViewDescriptor();
assert.equal(restored.enabled, true);
assert.equal(descriptor.instrument, 'NQ');
assert.equal(descriptor.timeframe, 240);
assert.equal(descriptor.overlaySyncMode, 'sync');
assert.deepEqual(descriptor.visibleWindow, { x: 12, y: 14, width: 55, height: 38 });

const sanitized = serializeComparisonWorkspaceState({
  enabled: true,
  descriptor: {
    instrument: 'bad',
	    timeframe: 'not-a-number',
	    overlaySyncMode: 'globally',
	    visibleWindow: { x: -10, y: 999, width: 5, height: 200 },
  },
  lastViewState: {
    requestedRange: { startTs: 1_704_896_400, endTs: 1_704_900_000 },
  },
  bars: [{ timestamp: 1 }],
});
assert.equal(sanitized.descriptor.instrument, 'BAD');
assert.equal(sanitized.descriptor.timeframe, 60);
assert.equal(sanitized.descriptor.overlaySyncMode, 'sync');
assert.deepEqual(sanitized.descriptor.visibleWindow, { x: 0, y: 12, width: 24, height: 88 });
assert.deepEqual(sanitized.lastViewState.requestedRange, { startTs: 1_704_896_400, endTs: 1_704_900_000 });
assert.equal(Object.hasOwn(sanitized, 'bars'), false);

const legacyLocal = serializeComparisonWorkspaceState({
  enabled: true,
  descriptor: {
    overlaySyncMode: 'local',
  },
});
assert.equal(legacyLocal.descriptor.overlaySyncMode, 'no-sync');

console.log('comparison-window-persistence-smoke passed');
