const JOURNAL_SNAPSHOT_VERSION = 1;

function normalizeSnapshotKey(key) {
  const value = String(key || '').trim();
  if (!value) {
    throw new Error('Journal snapshot key must be a non-empty string.');
  }
  return value;
}

function cloneEntries(entries = []) {
  if (!Array.isArray(entries)) {
    throw new Error('Journal snapshot entries must be an array.');
  }
  return JSON.parse(JSON.stringify(entries));
}

export function createJournalSnapshotValue({
  entries = [],
  savedAt,
} = {}, {
  now = () => new Date().toISOString(),
} = {}) {
  const timestamp = String(savedAt || now()).trim();
  if (!timestamp) {
    throw new Error('Journal snapshot savedAt must be a non-empty timestamp string.');
  }
  return {
    entries: cloneEntries(entries),
    savedAt: timestamp,
    version: JOURNAL_SNAPSHOT_VERSION,
  };
}

export function normalizeJournalSnapshotRecord(record) {
  if (!record) return null;
  const value = record.value || {};
  return {
    key: normalizeSnapshotKey(record.key),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    value: createJournalSnapshotValue(value, {
      now: () => value.savedAt,
    }),
  };
}

export function journalSnapshotPersistenceKey(key) {
  return normalizeSnapshotKey(key);
}
