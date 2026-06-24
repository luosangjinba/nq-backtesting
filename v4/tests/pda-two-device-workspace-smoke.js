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
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  localStorage: globalThis.localStorage,
};

const store = await import('../src/pda/pda-store.js');
const persistence = await import('../src/pda/pda-persistence.js');

const deviceAAnnotation = {
  id: 'device_a_fvg_1',
  type: 'fvg',
  topPrice: 30510.25,
  bottomPrice: 30498.75,
  startTime: 1780001000,
  endTime: 1780001120,
  sourceChartId: 'comparison-window',
  sourceInstrument: 'NQ',
  sourceTimeframe: 1,
  sourceTimeframeLabel: '1M',
  createdAt: 1780001000000,
  updatedAt: 1780001000000,
};

store.loadAnnotations([deviceAAnnotation]);

let serverDocument = null;
await persistence.saveAnnotationsToServer('NQ', null, {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace$/);
    assert.equal(options.method, 'PUT');
    const body = JSON.parse(options.body);
    assert.equal(body.domain, 'pda-annotations');
    assert.equal(body.instrument, 'NQ');
    assert.equal(body.payload.annotations[0].sourceChartId, 'comparison-window');
    serverDocument = {
      ok: true,
      found: true,
      user_id: 'default',
      workspace_id: 'default',
      domain: body.domain,
      instrument: body.instrument,
      version: body.version,
      savedAt: '2026-06-24T04:30:00Z',
      revision: '2026-06-24T04:30:00Z',
      payload: body.payload,
    };
    return {
      ok: true,
      status: 200,
      async json() {
        return serverDocument;
      },
    };
  },
});

assert.equal(serverDocument.payload.annotations.length, 1);

// Simulate a second browser/device with no local PDA state.
store.loadAnnotations([]);
globalThis.localStorage.clear();
assert.equal(store.getAnnotations().length, 0);

await persistence.syncAnnotationsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=pda-annotations&instrument=NQ$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return serverDocument;
      },
    };
  },
});

const restored = store.getAnnotations();
assert.equal(restored.length, 1);
assert.equal(restored[0].id, deviceAAnnotation.id);
assert.equal(restored[0].sourceChartId, 'comparison-window');
assert.equal(restored[0].sourceInstrument, 'NQ');
assert.equal(restored[0].sourceTimeframe, 1);

console.log('pda two-device workspace smoke passed');
