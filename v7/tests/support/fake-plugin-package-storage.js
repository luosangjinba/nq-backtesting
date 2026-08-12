import { PluginPackageStorageError } from '../../src/plugin-package-storage/public.js';

function emptyBackend() {
  return {
    generations: new Map(),
    inventory: null,
    journals: new Map(),
    receipts: new Map(),
    settings: new Map(),
  };
}

function cloneBackend(value) {
  return {
    generations: new Map([...value.generations].map(([key, record]) => [key, structuredClone(record)])),
    inventory: value.inventory === null ? null : structuredClone(value.inventory),
    journals: new Map([...value.journals].map(([key, record]) => [key, structuredClone(record)])),
    receipts: new Map([...value.receipts].map(([key, record]) => [key, structuredClone(record)])),
    settings: new Map([...value.settings].map(([key, record]) => [key, structuredClone(record)])),
  };
}

function restoreBackend(target, source) {
  for (const field of ['generations', 'journals', 'receipts', 'settings']) target[field] = source[field];
  target.inventory = source.inventory;
}

function snapshot(value) {
  return Object.freeze({
    generations: Object.freeze([...value.generations.values()].map((record) => structuredClone(record))),
    inventory: value.inventory === null ? null : structuredClone(value.inventory),
    journals: Object.freeze([...value.journals.values()].map((record) => structuredClone(record))),
    receipts: Object.freeze([...value.receipts.values()].map((record) => structuredClone(record))),
    settings: Object.freeze([...value.settings.values()].map((record) => structuredClone(record))),
  });
}

/** Deterministic atomic storage double with named before/write/after failure boundaries. */
export function createFakePluginPackageStorage({ backend = emptyBackend() } = {}) {
  let failure = null;
  let initialized = false;

  function trip(point) {
    if (failure?.point !== point || failure.remaining < 1) return;
    failure.remaining -= 1;
    throw new PluginPackageStorageError(
      failure.code,
      `Injected package storage failure at ${point}.`,
    );
  }

  function writes(change, field, map, key) {
    change[`${field}Deletes`].forEach((id, index) => {
      trip(`${change.phase}:${field}-delete:${index}`);
      map.delete(id);
    });
    change[`${field}Puts`].forEach((record, index) => {
      trip(`${change.phase}:${field}-put:${index}`);
      map.set(record[key], structuredClone(record));
    });
  }

  return Object.freeze({
    backend,
    clearFailure() { failure = null; },
    close() { initialized = false; },
    fail(point, {
      code = 'PLUGIN_PACKAGE_STORAGE_WRITE_FAILED',
      times = 1,
    } = {}) {
      failure = { code, point, remaining: times };
    },
    async initialize() { initialized = true; },
    async read() {
      if (!initialized) throw new PluginPackageStorageError(
        'PLUGIN_PACKAGE_STORAGE_UNINITIALIZED',
        'Fake package storage is closed.',
      );
      trip('read:before');
      return snapshot(backend);
    },
    async reset(inventory, expected) {
      if (!initialized) throw new PluginPackageStorageError('PLUGIN_PACKAGE_STORAGE_UNINITIALIZED', 'Fake package storage is closed.');
      trip('reset:before');
      const currentRevision = backend.inventory?.revision ?? null;
      const currentPending = backend.inventory?.pending?.transactionId ?? null;
      if (currentRevision !== expected?.revision
        || currentPending !== expected?.pendingTransactionId) {
        throw new PluginPackageStorageError(
          'PLUGIN_PACKAGE_STORAGE_CAS_STALE',
          'Fake restricted package inventory CAS is stale.',
        );
      }
      const original = cloneBackend(backend);
      try {
        backend.generations.clear();
        backend.journals.clear();
        backend.receipts.clear();
        backend.settings.clear();
        backend.inventory = structuredClone(inventory);
        trip('reset:after-apply');
      } catch (error) {
        restoreBackend(backend, original);
        throw error;
      }
    },
    tamper(action) { action(backend); },
    async transact(change) {
      if (!initialized) throw new PluginPackageStorageError('PLUGIN_PACKAGE_STORAGE_UNINITIALIZED', 'Fake package storage is closed.');
      trip(`${change.phase}:before`);
      const currentRevision = backend.inventory?.revision ?? null;
      const currentPending = backend.inventory?.pending?.transactionId ?? null;
      if (currentRevision !== change.expected.revision
        || currentPending !== change.expected.pendingTransactionId) {
        throw new PluginPackageStorageError(
          'PLUGIN_PACKAGE_STORAGE_CAS_STALE',
          'Fake package inventory CAS is stale.',
        );
      }
      const original = cloneBackend(backend);
      try {
        writes(change, 'generation', backend.generations, 'generationId');
        writes(change, 'settings', backend.settings, 'settingsRecordId');
        writes(change, 'journal', backend.journals, 'transactionId');
        writes(change, 'receipt', backend.receipts, 'commandId');
        trip(`${change.phase}:inventory-put`);
        backend.inventory = structuredClone(change.inventory);
      } catch (error) {
        restoreBackend(backend, original);
        throw error;
      }
      trip(`${change.phase}:after-apply`);
    },
  });
}
