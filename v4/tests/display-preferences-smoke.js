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

function createDocumentMock() {
  const properties = new Map();
  return {
    documentElement: {
      dataset: {},
      style: {
        setProperty(name, value) {
          properties.set(name, value);
        },
        getPropertyValue(name) {
          return properties.get(name) || '';
        },
      },
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.document = createDocumentMock();

const display = await import('../src/display/display-preferences.js');

assert.deepEqual(display.normalizeDisplayPreferences({ uiScale: '125', chartTextScale: 'xl' }), {
  uiScale: '125',
  chartTextScale: 'xl',
  inspectorDensity: 'compact',
});
assert.deepEqual(display.normalizeDisplayPreferences({ uiScale: 'bad', chartTextScale: 'bad' }), {
  uiScale: '100',
  chartTextScale: 'normal',
  inspectorDensity: 'compact',
});

display.setDisplayPreferences({
  uiScale: '125',
  chartTextScale: 'large',
  inspectorDensity: 'comfortable',
});
assert.equal(globalThis.document.documentElement.dataset.uiScale, '125');
assert.equal(globalThis.document.documentElement.dataset.chartTextScale, 'large');
assert.equal(globalThis.document.documentElement.dataset.inspectorDensity, 'comfortable');
assert.match(globalThis.document.documentElement.style.getPropertyValue('--ui-font-size'), /^16\.25px$/);

const savedRaw = globalThis.localStorage.getItem(display.getDisplayPreferencesStorageKey());
const saved = JSON.parse(savedRaw);
assert.equal(saved.version, 1);
assert.deepEqual(saved.preferences, {
  uiScale: '125',
  chartTextScale: 'large',
  inspectorDensity: 'comfortable',
});

display.resetDisplayPreferences();
assert.equal(globalThis.localStorage.getItem(display.getDisplayPreferencesStorageKey()), null);
assert.equal(globalThis.document.documentElement.dataset.uiScale, '100');

const serverPayload = {
  ok: true,
  found: true,
  user_id: 'default',
  workspace_id: 'default',
  domain: 'display-preferences',
  instrument: null,
  version: 1,
  savedAt: '2026-06-23T20:00:00Z',
  revision: '2026-06-23T20:00:00Z',
  payload: {
    version: 1,
    savedAt: '2026-06-23T20:00:00Z',
    preferences: {
      uiScale: '140',
      chartTextScale: 'xl',
      inspectorDensity: 'normal',
    },
  },
};
await display.syncDisplayPreferencesFromServer({
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=display-preferences$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return serverPayload;
      },
    };
  },
});
assert.equal(globalThis.document.documentElement.dataset.uiScale, '140');
assert.equal(globalThis.document.documentElement.dataset.chartTextScale, 'xl');
const serverSaved = JSON.parse(globalThis.localStorage.getItem(display.getDisplayPreferencesStorageKey()));
assert.deepEqual(serverSaved.preferences, serverPayload.payload.preferences);

const putCalls = [];
await display.saveDisplayPreferencesToServer(null, {
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
assert.equal(putBody.domain, display.getDisplayPreferencesWorkspaceDomain());
assert.deepEqual(putBody.payload.preferences, serverPayload.payload.preferences);

console.log('display preferences smoke passed');
