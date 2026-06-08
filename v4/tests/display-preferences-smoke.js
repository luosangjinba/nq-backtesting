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

console.log('display preferences smoke passed');
