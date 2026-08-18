const SNAPSHOT_SCHEMA = 'v7.user-state-snapshot';
const SNAPSHOT_VERSION = 1;
const METADATA_SCHEMA = 'v7.state-sync-client';
const METADATA_VERSION = 1;

/** Stable failure proving that an allowlisted storage rollback is incomplete. */
export class StateSnapshotRollbackError extends AggregateError {
  constructor(errors, message = 'State snapshot rollback was incomplete.') {
    super(errors, message);
    this.name = 'StateSnapshotRollbackError';
    this.code = 'STATE_SNAPSHOT_ROLLBACK_INCOMPLETE';
  }
}

/** Return whether a failure means exact local state can no longer be proven. */
export function isStateSnapshotRollbackError(error) {
  return error?.code === 'STATE_SNAPSHOT_ROLLBACK_INCOMPLETE';
}

export const STATE_SYNC_METADATA_KEY = 'v7.state-sync:metadata';
export const STATE_SYNC_BACKUP_PREFIX = 'v7.state-sync:backup:';
export const CALCULATED_SERIES_STATE_PREFIX = 'v7.calculated-series:document:';

const EXACT_KEYS = new Set([
  'v7.session-browser:index',
  'v7.replay-navigation-preferences',
  'v7.workstation-settings:global',
  'v7.color-history:global',
]);

/** Return whether one Web Storage key belongs to the replicated V7 state contract. */
export function isReplicatedStateKey(key) {
  return typeof key === 'string' && (
    EXACT_KEYS.has(key)
      || (key.startsWith('v7.session-browser:record:')
        && key.length > 'v7.session-browser:record:'.length)
      || (key.startsWith(CALCULATED_SERIES_STATE_PREFIX)
        && key.length > CALCULATED_SERIES_STATE_PREFIX.length)
  );
}

function freezeEntries(entries) {
  return Object.freeze(entries.map(({ key, value }) => Object.freeze({ key, value })));
}

/** Capture one canonical allowlisted snapshot from a Web Storage-compatible surface. */
export function captureReplicatedEntries(storage) {
  if (!Number.isSafeInteger(storage?.length) || typeof storage?.key !== 'function'
    || typeof storage?.getItem !== 'function') {
    throw new TypeError('State sync requires enumerable Web Storage.');
  }
  const entries = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!isReplicatedStateKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries.push({ key, value: String(value) });
  }
  entries.sort((left, right) => left.key.localeCompare(right.key));
  return freezeEntries(entries);
}

/** Replace only allowlisted V7 keys without touching unrelated site storage. */
export function applyReplicatedEntries(storage, entries) {
  const normalized = requireEntries(entries);
  const original = captureReplicatedEntries(storage);

  function replace(nextEntries) {
    const existing = captureReplicatedEntries(storage);
    for (const { key } of existing) storage.removeItem(key);
    for (const { key, value } of nextEntries) storage.setItem(key, value);
  }

  try {
    replace(normalized);
  } catch (applyError) {
    try {
      replace(original);
    } catch (rollbackError) {
      throw new StateSnapshotRollbackError(
        [applyError, rollbackError],
        'State snapshot replacement failed and its rollback was incomplete.',
      );
    }
    throw applyError;
  }
}

export function requireEntries(value) {
  if (!Array.isArray(value) || value.length > 4_096) {
    throw new TypeError('State entries must be a bounded array.');
  }
  const seen = new Set();
  const entries = value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Object.keys(entry).sort().join(',') !== 'key,value'
      || !isReplicatedStateKey(entry.key) || typeof entry.value !== 'string'
      || seen.has(entry.key)) {
      throw new TypeError('State entry is invalid.');
    }
    seen.add(entry.key);
    return { key: entry.key, value: entry.value };
  });
  entries.sort((left, right) => left.key.localeCompare(right.key));
  return freezeEntries(entries);
}

export function requireServerSnapshot(value) {
  if (value?.schema !== SNAPSHOT_SCHEMA || value.version !== SNAPSHOT_VERSION
    || typeof value.userId !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(value.userId)
    || !Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw new TypeError('Server state snapshot is invalid.');
  }
  return Object.freeze({
    entries: requireEntries(value.entries),
    revision: value.revision,
    userId: value.userId,
  });
}

export function replacementEnvelope(expectedRevision, entries) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new TypeError('State replacement requires a non-negative revision.');
  }
  return Object.freeze({
    entries: requireEntries(entries),
    expectedRevision,
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
  });
}

export async function entriesHash(entries, cryptoPort) {
  if (typeof cryptoPort?.subtle?.digest !== 'function') {
    throw new TypeError('State sync requires a Web Crypto digest port.');
  }
  const source = JSON.stringify(requireEntries(entries));
  const digest = await cryptoPort.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readSyncMetadata(storage) {
  const raw = storage.getItem(STATE_SYNC_METADATA_KEY);
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.schema !== METADATA_SCHEMA || value.version !== METADATA_VERSION
      || typeof value.userId !== 'string' || typeof value.contentHash !== 'string'
      || !Number.isSafeInteger(value.remoteRevision) || value.remoteRevision < 0) return null;
    return Object.freeze({
      contentHash: value.contentHash,
      remoteRevision: value.remoteRevision,
      userId: value.userId,
    });
  } catch {
    return null;
  }
}

export function writeSyncMetadata(storage, { contentHash, remoteRevision, userId }) {
  storage.setItem(STATE_SYNC_METADATA_KEY, JSON.stringify({
    contentHash,
    remoteRevision,
    schema: METADATA_SCHEMA,
    userId,
    version: METADATA_VERSION,
  }));
}

export function writeConflictBackup(storage, side, snapshot, nowEpochMs) {
  if (!['device', 'server'].includes(side) || !Number.isSafeInteger(nowEpochMs)) {
    throw new TypeError('State conflict backup input is invalid.');
  }
  const key = `${STATE_SYNC_BACKUP_PREFIX}${nowEpochMs}:${side}`;
  storage.setItem(key, JSON.stringify({
    entries: requireEntries(snapshot.entries),
    revision: snapshot.revision ?? null,
    schema: 'v7.state-sync-backup',
    side,
    userId: snapshot.userId ?? null,
    version: 1,
  }));
  return key;
}
