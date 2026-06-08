import assert from 'node:assert/strict';
import {
  createLocalPersistence,
  readLocalJson,
  removeLocalJson,
  writeLocalJson,
} from '../src/storage/local-persistence.js';

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
const errors = [];
const onError = (error, action) => errors.push(`${action}:${error.message}`);

assert.equal(readLocalJson('missing', { items: [] }, { storage, onError }).items.length, 0);
assert.equal(writeLocalJson('key', { items: [1, 2] }, { storage, onError }), true);
assert.deepEqual(readLocalJson('key', null, { storage, onError }), { items: [1, 2] });
assert.equal(removeLocalJson('key', { storage, onError }), true);
assert.equal(readLocalJson('key', 'fallback', { storage, onError }), 'fallback');

storage.setItem('bad-json', '{');
assert.equal(readLocalJson('bad-json', 'fallback', { storage, onError }), 'fallback');
assert.deepEqual(errors, ['read:Expected property name or \'}\' in JSON at position 1 (line 1 column 2)']);

const persistence = createLocalPersistence({
  key: 'persisted',
  fallback: { rows: [] },
  storage,
  onError,
});

persistence.write({ rows: ['saved'] });
assert.deepEqual(persistence.read(), { rows: ['saved'] });

persistence.runRestoring(() => {
  assert.equal(persistence.isRestoring(), true);
  assert.equal(persistence.write({ rows: ['ignored'] }), false);
});

assert.equal(persistence.isRestoring(), false);
assert.deepEqual(persistence.read(), { rows: ['saved'] });
assert.equal(persistence.remove(), true);
assert.deepEqual(persistence.read(), { rows: [] });

console.log('local persistence smoke passed');
