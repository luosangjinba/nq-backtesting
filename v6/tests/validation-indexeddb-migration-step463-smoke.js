import assert from 'node:assert/strict';
import {
  applyValidationIndexedDbMigrations,
  VALIDATION_DATABASE_VERSION,
  VALIDATION_STORE_DEFINITIONS,
} from '../src/validation-persistence/validation-persistence-schema.js';

const stores = new Map();
const database = {
  createObjectStore(name, options) {
    const indexes = [];
    const store = {
      createIndex(indexName, keyPath, indexOptions) {
        indexes.push({ keyPath, name: indexName, unique: indexOptions.unique });
      },
    };
    stores.set(name, { indexes, keyPath: options.keyPath });
    return store;
  },
};

applyValidationIndexedDbMigrations({ db: database, oldVersion: 0 });
assert.equal(VALIDATION_DATABASE_VERSION, 2);
assert.deepEqual([...stores.keys()].sort(), Object.keys(VALIDATION_STORE_DEFINITIONS).sort());
for (const [name, definition] of Object.entries(VALIDATION_STORE_DEFINITIONS)) {
  assert.equal(stores.get(name).keyPath, definition.keyPath);
  assert.deepEqual(stores.get(name).indexes, definition.indexes.map((index) => ({
    keyPath: index.keyPath,
    name: index.name,
    unique: index.unique,
  })));
}

const upgradedStores = [];
applyValidationIndexedDbMigrations({
  db: { createObjectStore(name) { upgradedStores.push(name); return { createIndex() {} }; } },
  oldVersion: 1,
});
assert.deepEqual(upgradedStores.sort(), ['validationEvidence', 'validationObservations']);

console.log('v6 validation IndexedDB migration step463 smoke passed');
