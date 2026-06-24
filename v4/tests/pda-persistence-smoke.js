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

globalThis.localStorage = createMemoryStorage();
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  localStorage: globalThis.localStorage,
};

const store = await import('../src/pda/pda-store.js');
const persistence = await import('../src/pda/pda-persistence.js');
const { getInstrumentStorageKey } = await import('../src/storage/instrument-storage.js');

const storageKey = getInstrumentStorageKey(persistence.getPdaStorageKeyBase(), 'NQ');

const localAnnotation = {
  id: 'local_bsl_1',
  type: 'bsl',
  price: 30410.25,
  sourceChartId: 'primary',
  sourceInstrument: 'NQ',
  sourceTimeframe: 60,
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

globalThis.localStorage.setItem(storageKey, JSON.stringify({
  version: 1,
  savedAt: 1780000000001,
  instrument: 'NQ',
  annotations: [localAnnotation, { id: 'draft_1', type: 'bsl', source: 'draft' }],
}));

persistence.restoreAnnotations('NQ', { syncServer: false });
assert.equal(store.getAnnotations().length, 1);
assert.equal(store.getAnnotations()[0].id, localAnnotation.id);

const putCalls = [];
await persistence.saveAnnotationsToServer('NQ', null, {
  fetchImpl: async (url, options = {}) => {
    putCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(putCalls.length, 1);
assert.match(putCalls[0].url, /\/v4\/workspace$/);
assert.equal(putCalls[0].options.method, 'PUT');
const putBody = JSON.parse(putCalls[0].options.body);
assert.equal(putBody.domain, persistence.getPdaWorkspaceDomain());
assert.equal(putBody.instrument, 'NQ');
assert.equal(putBody.payload.annotations.length, 1);
assert.equal(putBody.payload.annotations[0].id, localAnnotation.id);

const serverAnnotation = {
  id: 'server_fvg_1',
  type: 'fvg',
  topPrice: 30500,
  bottomPrice: 30480,
  startTime: 1780000000,
  endTime: 1780000120,
  sourceChartId: 'comparison-window',
  sourceInstrument: 'NQ',
  sourceTimeframe: 1,
  createdAt: 1780000100000,
  updatedAt: 1780000100000,
};
await persistence.syncAnnotationsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=pda-annotations&instrument=NQ$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          found: true,
          user_id: 'default',
          workspace_id: 'default',
          domain: 'pda-annotations',
          instrument: 'NQ',
          version: 1,
          savedAt: '2026-06-23T20:00:00Z',
          revision: '2026-06-23T20:00:00Z',
          payload: {
            version: 1,
            savedAt: 1780000100001,
            instrument: 'NQ',
            annotations: [serverAnnotation],
          },
        };
      },
    };
  },
});
assert.equal(store.getAnnotations().length, 1);
assert.equal(store.getAnnotations()[0].id, serverAnnotation.id);
assert.equal(store.getAnnotations()[0].sourceChartId, 'comparison-window');
const localAfterServer = JSON.parse(globalThis.localStorage.getItem(storageKey));
assert.equal(localAfterServer.annotations[0].id, serverAnnotation.id);

const migrationCalls = [];
globalThis.localStorage.setItem(storageKey, JSON.stringify({
  version: 1,
  savedAt: 1780000200001,
  instrument: 'NQ',
  annotations: [localAnnotation],
}));
await persistence.syncAnnotationsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    migrationCalls.push({ url, options });
    if (options.method === 'GET') {
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true, found: false, payload: null };
        },
      };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(migrationCalls.length, 2);
assert.equal(migrationCalls[0].options.method, 'GET');
assert.equal(migrationCalls[1].options.method, 'PUT');
const migrationPutBody = JSON.parse(migrationCalls[1].options.body);
assert.equal(migrationPutBody.payload.annotations[0].id, localAnnotation.id);

store.loadAnnotations([serverAnnotation]);
const explicitMigrationCalls = [];
await persistence.migrateCurrentPdaAnnotationsToServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    explicitMigrationCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(explicitMigrationCalls.length, 1);
const explicitPutBody = JSON.parse(explicitMigrationCalls[0].options.body);
assert.equal(explicitPutBody.domain, 'pda-annotations');
assert.equal(explicitPutBody.instrument, 'NQ');
assert.equal(explicitPutBody.payload.annotations[0].id, serverAnnotation.id);

console.log('pda persistence smoke passed');
