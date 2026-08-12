import { failPluginPackageStorage, PluginPackageStorageError } from './storage-error.js';

export const PLUGIN_PACKAGE_DATABASE_NAME = 'v7.plugin-package-store';
export const PLUGIN_PACKAGE_DATABASE_VERSION = 1;

const STORES = Object.freeze([
  'generations', 'inventory', 'journals', 'receipts', 'settings',
]);
const PHASES = new Set([
  'commit', 'finalize', 'initialize', 'reset', 'rollback', 'stage',
]);

function requireFactory(value) {
  if (typeof value?.open !== 'function') {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_UNAVAILABLE', 'IndexedDB is unavailable.');
  }
  return value;
}

function translatedFailure(error, fallbackCode, message) {
  if (error instanceof PluginPackageStorageError) return error;
  const code = error?.name === 'QuotaExceededError'
    ? 'PLUGIN_PACKAGE_STORAGE_QUOTA' : fallbackCode;
  return new PluginPackageStorageError(code, message, { cause: error });
}

function expectedIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'pendingTransactionId,revision'
    || (value.revision !== null && (!Number.isSafeInteger(value.revision) || value.revision < 0))
    || (value.pendingTransactionId !== null && typeof value.pendingTransactionId !== 'string')) {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_CHANGE_INVALID', 'Storage CAS identity is invalid.');
  }
  return value;
}

function recordList(value, key, label) {
  if (!Array.isArray(value) || value.some((entry) => !entry || typeof entry !== 'object'
    || typeof entry[key] !== 'string')) {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_CHANGE_INVALID', `${label} puts are invalid.`);
  }
  return value;
}

function idList(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_CHANGE_INVALID', `${label} deletes are invalid.`);
  }
  return value;
}

function normalizedChange(value) {
  const fields = [
    'expected', 'generationDeletes', 'generationPuts', 'inventory', 'journalDeletes',
    'journalPuts', 'phase', 'receiptDeletes', 'receiptPuts', 'settingsDeletes',
    'settingsPuts',
  ];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== fields.sort().join(',')
    || !PHASES.has(value.phase) || !value.inventory || typeof value.inventory !== 'object') {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_CHANGE_INVALID', 'Atomic storage change is invalid.');
  }
  return Object.freeze({
    expected: expectedIdentity(value.expected),
    generationDeletes: idList(value.generationDeletes, 'Generation'),
    generationPuts: recordList(value.generationPuts, 'generationId', 'Generation'),
    inventory: value.inventory,
    journalDeletes: idList(value.journalDeletes, 'Journal'),
    journalPuts: recordList(value.journalPuts, 'transactionId', 'Journal'),
    phase: value.phase,
    receiptDeletes: idList(value.receiptDeletes, 'Receipt'),
    receiptPuts: recordList(value.receiptPuts, 'commandId', 'Receipt'),
    settingsDeletes: idList(value.settingsDeletes, 'Settings'),
    settingsPuts: recordList(value.settingsPuts, 'settingsRecordId', 'Settings'),
  });
}

function pendingId(inventory) {
  return inventory?.pending?.transactionId ?? null;
}

function queueChanges(transaction, change) {
  const operations = [
    ['generations', change.generationDeletes, change.generationPuts, 'generationId'],
    ['settings', change.settingsDeletes, change.settingsPuts, 'settingsRecordId'],
    ['journals', change.journalDeletes, change.journalPuts, 'transactionId'],
    ['receipts', change.receiptDeletes, change.receiptPuts, 'commandId'],
  ];
  for (const [storeName, deletes, puts, key] of operations) {
    const store = transaction.objectStore(storeName);
    for (const id of deletes) store.delete(id);
    for (const record of puts) store.put(record, record[key]);
  }
  transaction.objectStore('inventory').put(change.inventory, 'current');
}

function openDatabase(indexedDBFactory, databaseName) {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDBFactory.open(databaseName, PLUGIN_PACKAGE_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of STORES) {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
      }
    };
    request.onerror = () => reject(translatedFailure(
      request.error,
      'PLUGIN_PACKAGE_STORAGE_OPEN_FAILED',
      'Package IndexedDB could not be opened.',
    ));
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new PluginPackageStorageError(
        'PLUGIN_PACKAGE_STORAGE_OPEN_BLOCKED',
        'Another page blocked the package database upgrade.',
      ));
    };
  });
}

function createTransaction(database, mode, fallbackCode, message) {
  try {
    return database.transaction(STORES, mode, { durability: 'strict' });
  } catch (error) {
    throw translatedFailure(error, fallbackCode, message);
  }
}

/** Construct the sole browser adapter for atomic package generations and inventory CAS. */
export function createIndexedDbPluginPackageStorage({
  databaseName = PLUGIN_PACKAGE_DATABASE_NAME,
  indexedDB = globalThis.indexedDB,
} = {}) {
  const factory = requireFactory(indexedDB);
  if (typeof databaseName !== 'string' || databaseName.length < 1 || databaseName.length > 128) {
    failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_NAME_INVALID', 'Package database name is invalid.');
  }
  let database = null;
  let lifecycleRevision = 0;
  let opening = null;

  async function initialize() {
    if (database !== null) return;
    if (opening !== null) return opening;
    const expectedLifecycleRevision = lifecycleRevision;
    const pending = openDatabase(factory, databaseName).then((opened) => {
      if (expectedLifecycleRevision !== lifecycleRevision) {
        opened.close();
        failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_UNINITIALIZED', 'Package storage closed during initialization.');
      }
      database = opened;
      opened.onversionchange = () => {
        opened.close();
        if (database === opened) database = null;
      };
    }).finally(() => {
      if (opening === pending) opening = null;
    });
    opening = pending;
    return pending;
  }

  function requireOpen() {
    if (database === null) {
      failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_UNINITIALIZED', 'Package storage is not initialized.');
    }
    return database;
  }

  async function read() {
    const db = requireOpen();
    const transaction = createTransaction(
      db,
      'readonly',
      'PLUGIN_PACKAGE_STORAGE_READ_FAILED',
      'Package storage snapshot could not be read.',
    );
    return new Promise((resolve, reject) => {
      let failure = null;
      const requests = Object.fromEntries(STORES.map((storeName) => [
        storeName,
        storeName === 'inventory'
          ? transaction.objectStore(storeName).get('current')
          : transaction.objectStore(storeName).getAll(),
      ]));
      transaction.onerror = () => { failure ??= transaction.error; };
      transaction.onabort = () => reject(translatedFailure(
        failure ?? transaction.error,
        'PLUGIN_PACKAGE_STORAGE_READ_FAILED',
        'Package storage snapshot could not be read.',
      ));
      transaction.oncomplete = () => resolve(Object.freeze({
        generations: Object.freeze(requests.generations.result ?? []),
        inventory: requests.inventory.result ?? null,
        journals: Object.freeze(requests.journals.result ?? []),
        receipts: Object.freeze(requests.receipts.result ?? []),
        settings: Object.freeze(requests.settings.result ?? []),
      }));
    });
  }

  async function transact(candidate) {
    const change = normalizedChange(candidate);
    const db = requireOpen();
    const transaction = createTransaction(
      db,
      'readwrite',
      'PLUGIN_PACKAGE_STORAGE_WRITE_FAILED',
      'Atomic package storage phase failed.',
    );
    return new Promise((resolve, reject) => {
      let failure = null;
      const request = transaction.objectStore('inventory').get('current');
      request.onerror = () => { failure = request.error; };
      request.onsuccess = () => {
        const current = request.result ?? null;
        const revision = current?.revision ?? null;
        if (revision !== change.expected.revision
          || pendingId(current) !== change.expected.pendingTransactionId) {
          failure = new PluginPackageStorageError(
            'PLUGIN_PACKAGE_STORAGE_CAS_STALE',
            'Package inventory changed before the atomic storage phase.',
          );
          transaction.abort();
          return;
        }
        try {
          queueChanges(transaction, change);
          transaction.commit?.();
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.onerror = () => { failure ??= transaction.error; };
      transaction.onabort = () => reject(translatedFailure(
        failure ?? transaction.error,
        'PLUGIN_PACKAGE_STORAGE_WRITE_FAILED',
        'Atomic package storage phase failed.',
      ));
      transaction.oncomplete = () => resolve();
    });
  }

  async function reset(inventory, expected) {
    const db = requireOpen();
    if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
      failPluginPackageStorage('PLUGIN_PACKAGE_STORAGE_CHANGE_INVALID', 'Reset inventory is invalid.');
    }
    const identity = expectedIdentity(expected);
    const transaction = createTransaction(
      db,
      'readwrite',
      'PLUGIN_PACKAGE_STORAGE_RESET_FAILED',
      'Restricted package inventory removal failed.',
    );
    return new Promise((resolve, reject) => {
      let failure = null;
      const request = transaction.objectStore('inventory').get('current');
      request.onerror = () => { failure = request.error; };
      request.onsuccess = () => {
        const current = request.result ?? null;
        if ((current?.revision ?? null) !== identity.revision
          || pendingId(current) !== identity.pendingTransactionId) {
          failure = new PluginPackageStorageError(
            'PLUGIN_PACKAGE_STORAGE_CAS_STALE',
            'Package inventory changed before restricted removal.',
          );
          transaction.abort();
          return;
        }
        try {
          for (const storeName of STORES) transaction.objectStore(storeName).clear();
          transaction.objectStore('inventory').put(inventory, 'current');
          transaction.commit?.();
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.onerror = () => { failure ??= transaction.error; };
      transaction.onabort = () => reject(translatedFailure(
        failure ?? transaction.error,
        'PLUGIN_PACKAGE_STORAGE_RESET_FAILED',
        'Restricted package inventory removal failed.',
      ));
      transaction.oncomplete = () => resolve();
    });
  }

  return Object.freeze({
    close() {
      lifecycleRevision += 1;
      opening = null;
      database?.close();
      database = null;
    },
    initialize,
    read,
    reset,
    transact,
  });
}
