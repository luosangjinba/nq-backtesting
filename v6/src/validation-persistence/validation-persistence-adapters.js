import {
  applyValidationIndexedDbMigrations,
  VALIDATION_DATABASE_NAME,
  VALIDATION_DATABASE_VERSION,
  VALIDATION_STORE_DEFINITIONS,
} from './validation-persistence-schema.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function keyValue(record, keyPath) {
  return Array.isArray(keyPath)
    ? keyPath.map((field) => record?.[field])
    : record?.[keyPath];
}

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function createMemoryStoreFacade(records, definition) {
  function assertUnique(record, replacingKey = null) {
    definition.indexes.filter((index) => index.unique).forEach((index) => {
      const value = keyValue(record, index.keyPath);
      const duplicate = [...records.values()].find((candidate) => (
        !sameKey(keyValue(candidate, definition.keyPath), replacingKey)
        && sameKey(keyValue(candidate, index.keyPath), value)
      ));
      if (duplicate) throw new Error(`Unique validation index violation: ${index.name}`);
    });
  }

  return {
    async add(record) {
      const key = keyValue(record, definition.keyPath);
      if (records.has(key)) throw new Error(`Validation record already exists: ${key}`);
      assertUnique(record);
      records.set(key, clone(record));
      return clone(record);
    },
    async get(key) {
      return clone(records.get(key) ?? null);
    },
    async getAll() {
      return [...records.values()].map(clone);
    },
    async getAllByIndex(indexName, value) {
      const index = definition.indexes.find((candidate) => candidate.name === indexName);
      if (!index) throw new Error(`Unknown validation index: ${indexName}`);
      return [...records.values()]
        .filter((record) => sameKey(keyValue(record, index.keyPath), value))
        .map(clone);
    },
    async put(record) {
      const key = keyValue(record, definition.keyPath);
      assertUnique(record, key);
      records.set(key, clone(record));
      return clone(record);
    },
  };
}

export function createMemoryValidationDatabase() {
  return {
    stores: new Map(),
    version: 0,
  };
}

export function createMemoryValidationPersistenceAdapter({
  database = createMemoryValidationDatabase(),
} = {}) {
  async function open() {
    if (database.version < VALIDATION_DATABASE_VERSION) {
      Object.keys(VALIDATION_STORE_DEFINITIONS).forEach((name) => {
        if (!database.stores.has(name)) database.stores.set(name, new Map());
      });
      database.version = VALIDATION_DATABASE_VERSION;
    }
  }

  async function transaction(storeNames, mode, operation) {
    await open();
    const writable = mode === 'readwrite';
    const selected = new Map(storeNames.map((name) => {
      const source = database.stores.get(name);
      if (!source) throw new Error(`Unknown validation store: ${name}`);
      return [name, writable ? new Map([...source].map(([key, value]) => [key, clone(value)])) : source];
    }));
    const context = {
      store(name) {
        const records = selected.get(name);
        const definition = VALIDATION_STORE_DEFINITIONS[name];
        if (!records || !definition) throw new Error(`Store not in validation transaction: ${name}`);
        return createMemoryStoreFacade(records, definition);
      },
    };
    const result = await operation(context);
    if (writable) {
      selected.forEach((records, name) => database.stores.set(name, records));
    }
    return result;
  }

  function inspect() {
    return {
      stores: [...database.stores.keys()].sort(),
      version: database.version,
    };
  }

  async function close() {}

  return { close, inspect, open, transaction };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(clone(request.result)), { once: true });
    request.addEventListener('error', () => reject(request.error), { once: true });
  });
}

function transactionCompletion(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', resolve, { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error || new Error('Validation transaction aborted.')), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error), { once: true });
  });
}

function indexedStoreFacade(store) {
  return {
    async add(record) {
      await requestResult(store.add(clone(record)));
      return clone(record);
    },
    async get(key) {
      return (await requestResult(store.get(key))) ?? null;
    },
    async getAll() {
      return requestResult(store.getAll());
    },
    async getAllByIndex(indexName, value) {
      return requestResult(store.index(indexName).getAll(value));
    },
    async put(record) {
      await requestResult(store.put(clone(record)));
      return clone(record);
    },
  };
}

export function createIndexedDbValidationPersistenceAdapter({
  databaseName = VALIDATION_DATABASE_NAME,
  indexedDB = globalThis.indexedDB,
} = {}) {
  let databasePromise = null;

  async function open() {
    if (databasePromise) return databasePromise;
    if (!indexedDB || typeof indexedDB.open !== 'function') {
      throw new Error('Validation persistence requires IndexedDB.');
    }
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, VALIDATION_DATABASE_VERSION);
      request.addEventListener('upgradeneeded', (event) => {
        applyValidationIndexedDbMigrations({
          db: request.result,
          oldVersion: event.oldVersion,
        });
      });
      request.addEventListener('success', () => resolve(request.result), { once: true });
      request.addEventListener('error', () => reject(request.error), { once: true });
      request.addEventListener('blocked', () => reject(new Error('Validation IndexedDB upgrade is blocked.')), { once: true });
    });
    return databasePromise;
  }

  async function transaction(storeNames, mode, operation) {
    const database = await open();
    const nativeTransaction = database.transaction(storeNames, mode);
    const completion = transactionCompletion(nativeTransaction);
    const context = {
      store(name) {
        if (!storeNames.includes(name)) {
          throw new Error(`Store not in validation transaction: ${name}`);
        }
        return indexedStoreFacade(nativeTransaction.objectStore(name));
      },
    };
    try {
      const result = await operation(context);
      await completion;
      return result;
    } catch (error) {
      try { nativeTransaction.abort(); } catch { /* already completed */ }
      throw error;
    }
  }

  async function close() {
    if (!databasePromise) return;
    const database = await databasePromise;
    database.close();
    databasePromise = null;
  }

  return { close, open, transaction };
}
