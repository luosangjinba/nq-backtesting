import {
  clonePersistenceRecord,
  createPersistenceRecord,
  updatePersistenceRecord,
} from './persistence-record.js';

function recordId(collection, key) {
  return `${collection}:${key}`;
}

function cloneRecords(records = []) {
  return records.map(clonePersistenceRecord);
}

export function createMemoryPersistenceAdapter({
  initialRecords = [],
} = {}) {
  let records = cloneRecords(initialRecords);

  function readAll() {
    return cloneRecords(records);
  }

  function writeAll(nextRecords = []) {
    records = cloneRecords(nextRecords);
    return readAll();
  }

  return {
    readAll,
    writeAll,
  };
}

export function createWebStoragePersistenceAdapter({
  key = 'v6.persistence.records',
  storage = globalThis.localStorage,
} = {}) {
  function readAll() {
    const raw = storage?.getItem?.(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Persistence storage payload must be an array.');
    }
    return cloneRecords(parsed);
  }

  function writeAll(nextRecords = []) {
    const records = cloneRecords(nextRecords);
    storage?.setItem?.(key, JSON.stringify(records));
    return records;
  }

  return {
    readAll,
    writeAll,
  };
}

export function createPersistenceRepository({
  adapter = createMemoryPersistenceAdapter(),
  now = () => Date.now(),
} = {}) {
  function readRecords() {
    return adapter.readAll();
  }

  function writeRecords(records) {
    return adapter.writeAll(records);
  }

  function list(collection = null) {
    const records = readRecords();
    return (collection
      ? records.filter((record) => record.collection === collection)
      : records)
      .sort((left, right) => {
        const collectionOrder = left.collection.localeCompare(right.collection);
        return collectionOrder || left.key.localeCompare(right.key);
      })
      .map(clonePersistenceRecord);
  }

  function get(collection, key) {
    const id = recordId(collection, key);
    const record = readRecords().find((item) => recordId(item.collection, item.key) === id);
    return record ? clonePersistenceRecord(record) : null;
  }

  function save(payload = {}) {
    const existing = get(payload.collection, payload.key);
    const record = existing
      ? updatePersistenceRecord(existing, payload.value, { now })
      : createPersistenceRecord(payload, { now });
    const records = readRecords().filter((item) => recordId(item.collection, item.key) !== recordId(record.collection, record.key));
    records.push(record);
    writeRecords(records);
    return clonePersistenceRecord(record);
  }

  function remove(collection, key) {
    const id = recordId(collection, key);
    const records = readRecords();
    const nextRecords = records.filter((item) => recordId(item.collection, item.key) !== id);
    writeRecords(nextRecords);
    return records.length !== nextRecords.length;
  }

  function clear() {
    writeRecords([]);
  }

  return {
    clear,
    get,
    list,
    remove,
    save,
  };
}
