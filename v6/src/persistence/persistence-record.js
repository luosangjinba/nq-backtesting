export const PERSISTENCE_COLLECTIONS = Object.freeze([
  'recentSessions',
  'userNotes',
  'workspaceDrafts',
]);

function normalizeCollection(collection) {
  const value = String(collection || '').trim();
  if (!PERSISTENCE_COLLECTIONS.includes(value)) {
    throw new Error(`Unsupported persistence collection: ${collection}`);
  }
  return value;
}

function normalizeKey(key) {
  const value = String(key || '').trim();
  if (!value) {
    throw new Error('Persistence record key must be a non-empty string.');
  }
  return value;
}

function cloneJsonValue(value) {
  if (value === undefined) {
    throw new Error('Persistence record value must not be undefined.');
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeTimestamp(value, fallback) {
  const timestamp = Number(value ?? fallback);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Persistence record timestamp must be finite.');
  }
  return timestamp;
}

export function createPersistenceRecord({
  collection,
  createdAt,
  key,
  updatedAt,
  value,
} = {}, {
  now = () => Date.now(),
} = {}) {
  const timestamp = normalizeTimestamp(createdAt, now());
  return Object.freeze({
    collection: normalizeCollection(collection),
    createdAt: timestamp,
    key: normalizeKey(key),
    updatedAt: normalizeTimestamp(updatedAt, timestamp),
    value: Object.freeze(cloneJsonValue(value)),
  });
}

export function updatePersistenceRecord(record, value, {
  now = () => Date.now(),
} = {}) {
  return createPersistenceRecord({
    ...record,
    updatedAt: now(),
    value,
  });
}

export function clonePersistenceRecord(record) {
  return createPersistenceRecord(record, {
    now: () => record?.createdAt ?? Date.now(),
  });
}
