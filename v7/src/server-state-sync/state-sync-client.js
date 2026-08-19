import {
  applyReplicatedEntries,
  captureReplicatedEntries,
  entriesHash,
  isStateSnapshotRollbackError,
  isReplicatedStateKey,
  readSyncMetadata,
  replacementEnvelope,
  requireServerSnapshot,
  STATE_SYNC_METADATA_KEY,
  StateSnapshotRollbackError,
  writeConflictBackup,
  writeSyncMetadata,
} from './snapshot.js';

const SNAPSHOT_PATH = '/v7/state/snapshot';

function requireOptions(options) {
  if (typeof options?.fetch !== 'function' || typeof options?.reload !== 'function'
    || typeof options?.crypto?.subtle?.digest !== 'function'
    || typeof options?.storage?.getItem !== 'function'
    || typeof options?.storage?.setItem !== 'function'
    || typeof options?.storage?.removeItem !== 'function') {
    throw new TypeError('Server state sync requires fetch, reload, crypto, and Web Storage ports.');
  }
  return options;
}

function requestTimeoutMs(value) {
  const timeout = value ?? 5_000;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) {
    throw new TypeError('State sync request timeout must be from 1 to 60000 milliseconds.');
  }
  return timeout;
}

function publicSnapshot(state) {
  return Object.freeze({
    message: state.message,
    revision: state.revision,
    status: state.status,
    userId: state.userId,
  });
}

class StateSyncPoisonedError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'StateSyncPoisonedError';
    this.code = 'STATE_SYNC_RELOAD_REQUIRED';
  }
}

/** Own local-first replication of allowlisted V7 Web Storage state. */
export function createServerStateSync(rawOptions) {
  const options = requireOptions(rawOptions);
  const endpoint = options.endpoint ?? SNAPSHOT_PATH;
  const timeoutMs = requestTimeoutMs(options.requestTimeoutMs);
  const rawStorage = options.storage;
  const listeners = new Set();
  let state = {
    message: 'Preparing server sync…', revision: null, status: 'initializing', userId: null,
  };
  let remoteConflict = null;
  let disposed = false;
  let initialized = false;
  let syncScheduled = false;
  let pending = Promise.resolve();

  function publish(next) {
    if (disposed || (state.status === 'poisoned' && next.status !== 'poisoned')) {
      return publicSnapshot(state);
    }
    state = { ...state, ...next };
    const snapshot = publicSnapshot(state);
    for (const listener of listeners) listener(snapshot);
    return snapshot;
  }

  function poison(error) {
    remoteConflict = null;
    syncScheduled = false;
    publish({
      message: 'Local saved state could not be restored exactly. Reload this page before continuing.',
      status: 'poisoned',
    });
    return new StateSyncPoisonedError(
      'State synchronization is poisoned because local rollback was incomplete.',
      { cause: error },
    );
  }

  function requireHealthyMutation() {
    if (disposed) throw new Error('State synchronization is disposed.');
    if (state.status === 'poisoned') {
      throw new StateSyncPoisonedError(
        'State synchronization requires a page reload before local state may change.',
      );
    }
  }

  async function hash(entries) {
    return entriesHash(entries, options.crypto);
  }

  function metadata(snapshot, contentHash) {
    requireHealthyMutation();
    writeSyncMetadata(rawStorage, {
      contentHash,
      remoteRevision: snapshot.revision,
      userId: snapshot.userId,
    });
  }

  async function readRemote() {
    const response = await options.fetch(endpoint, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404 || response.status === 405) return null;
    if (!response.ok) throw new Error(`State service returned HTTP ${response.status}.`);
    return requireServerSnapshot(await response.json());
  }

  async function replaceRemote(expectedRevision, entries) {
    requireHealthyMutation();
    const response = await options.fetch(endpoint, {
      body: JSON.stringify(replacementEnvelope(expectedRevision, entries)),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: 'PUT',
      signal: AbortSignal.timeout(timeoutMs),
    });
    requireHealthyMutation();
    const body = await response.json().catch(() => null);
    requireHealthyMutation();
    if (response.status === 409) {
      const current = requireServerSnapshot(body?.current);
      remoteConflict = current;
      publish({
        message: 'This device and the server both changed. Choose which copy to keep.',
        revision: current.revision,
        status: 'conflict',
        userId: current.userId,
      });
      return null;
    }
    if (!response.ok) throw new Error(`State service returned HTTP ${response.status}.`);
    return requireServerSnapshot(body);
  }

  function restoreMetadata(rawValue) {
    if (rawValue === null) rawStorage.removeItem(STATE_SYNC_METADATA_KEY);
    else rawStorage.setItem(STATE_SYNC_METADATA_KEY, rawValue);
  }

  async function hydrateRemote(remote, { backupDevice = false, contentHash } = {}) {
    const localEntries = captureReplicatedEntries(rawStorage);
    const previousMetadata = rawStorage.getItem(STATE_SYNC_METADATA_KEY);
    const remoteHash = contentHash ?? await hash(remote.entries);
    requireHealthyMutation();
    try {
      if (backupDevice) {
        writeConflictBackup(rawStorage, 'device', {
          entries: localEntries, revision: state.revision, userId: state.userId,
        }, options.now());
      }
      applyReplicatedEntries(rawStorage, remote.entries);
      metadata(remote, remoteHash);
    } catch (hydrateError) {
      try {
        applyReplicatedEntries(rawStorage, localEntries);
        restoreMetadata(previousMetadata);
      } catch (rollbackError) {
        throw new StateSnapshotRollbackError(
          [hydrateError, rollbackError],
          'Remote state hydration failed and its rollback was incomplete.',
        );
      }
      if (isStateSnapshotRollbackError(hydrateError)) {
        throw new Error('Remote state hydration failed; the outer snapshot was restored.', {
          cause: hydrateError,
        });
      }
      throw hydrateError;
    }
    requireHealthyMutation();
    remoteConflict = null;
    publish({
      message: `Synced as ${remote.userId}`,
      revision: remote.revision,
      status: 'synced',
      userId: remote.userId,
    });
  }

  async function hydrateAutomatically(remote, contentHash) {
    try {
      await hydrateRemote(remote, { contentHash });
    } catch (error) {
      if (isStateSnapshotRollbackError(error)) {
        poison(error);
        return;
      }
      publish({
        message: `Saved on this device; server hydration failed. ${error.message}`,
        status: 'offline',
      });
    }
  }

  async function upload(entries, expectedRevision) {
    requireHealthyMutation();
    publish({ message: 'Saving this device to the server…', status: 'syncing' });
    const remote = await replaceRemote(expectedRevision, entries);
    requireHealthyMutation();
    if (remote === null) return false;
    const contentHash = await hash(entries);
    requireHealthyMutation();
    metadata(remote, contentHash);
    remoteConflict = null;
    publish({
      message: `Synced as ${remote.userId}`,
      revision: remote.revision,
      status: 'synced',
      userId: remote.userId,
    });
    return true;
  }

  async function uploadAutomatically(entries, expectedRevision) {
    try {
      return await upload(entries, expectedRevision);
    } catch (error) {
      publish({
        message: `Saved on this device; server sync is offline. ${error.message}`,
        status: 'offline',
      });
      return false;
    }
  }

  async function reconcile() {
    if (disposed || state.status === 'poisoned') return;
    publish({ message: 'Checking server state…', status: 'syncing' });
    let remote;
    try {
      remote = await readRemote();
    } catch (error) {
      publish({
        message: `Saved on this device; server sync is offline. ${error.message}`,
        status: 'offline',
      });
      return;
    }
    if (disposed || state.status === 'poisoned') return;
    if (remote === null) {
      publish({ message: 'Stored on this device', revision: null, status: 'local', userId: null });
      return;
    }
    const localEntries = captureReplicatedEntries(rawStorage);
    const [localHash, remoteHash] = await Promise.all([hash(localEntries), hash(remote.entries)]);
    if (disposed || state.status === 'poisoned') return;
    const known = readSyncMetadata(rawStorage);
    if (localHash === remoteHash) {
      metadata(remote, remoteHash);
      publish({
        message: `Synced as ${remote.userId}`,
        revision: remote.revision,
        status: 'synced',
        userId: remote.userId,
      });
      return;
    }
    if (remote.revision === 0 && remote.entries.length === 0) {
      await uploadAutomatically(localEntries, 0);
      return;
    }
    if (localEntries.length === 0) {
      await hydrateAutomatically(remote, remoteHash);
      return;
    }
    const sameUser = known?.userId === remote.userId;
    const localUnchanged = sameUser && known.contentHash === localHash;
    const remoteUnchanged = sameUser && known.remoteRevision === remote.revision;
    if (localUnchanged && !remoteUnchanged) {
      await hydrateAutomatically(remote, remoteHash);
      return;
    }
    if (!localUnchanged && remoteUnchanged) {
      await uploadAutomatically(localEntries, remote.revision);
      return;
    }
    remoteConflict = remote;
    publish({
      message: 'This device and the server contain different saved state.',
      revision: remote.revision,
      status: 'conflict',
      userId: remote.userId,
    });
  }

  async function pushCurrent() {
    if (disposed || !initialized || state.status === 'poisoned'
      || !['synced', 'syncing'].includes(state.status)) return;
    const entries = captureReplicatedEntries(rawStorage);
    const contentHash = await hash(entries);
    if (disposed || state.status === 'poisoned') return;
    const known = readSyncMetadata(rawStorage);
    if (known?.userId === state.userId && known.contentHash === contentHash) return;
    try {
      await upload(entries, state.revision);
    } catch (error) {
      publish({
        message: `Saved on this device; server sync is offline. ${error.message}`,
        status: 'offline',
      });
    }
  }

  function enqueueSync() {
    if (syncScheduled || disposed || !initialized || state.status === 'poisoned') return;
    syncScheduled = true;
    queueMicrotask(() => {
      syncScheduled = false;
      pending = pending.then(pushCurrent);
    });
  }

  const storage = Object.freeze({
    get length() { return rawStorage.length; },
    key(index) { return rawStorage.key(index); },
    getItem(key) { return rawStorage.getItem(key); },
    removeItem(key) {
      requireHealthyMutation();
      rawStorage.removeItem(key);
      if (isReplicatedStateKey(key)) enqueueSync();
    },
    setItem(key, value) {
      requireHealthyMutation();
      rawStorage.setItem(key, value);
      if (isReplicatedStateKey(key)) enqueueSync();
    },
  });

  async function flush() {
    if (disposed || state.status === 'poisoned') return;
    if (syncScheduled) {
      syncScheduled = false;
      pending = pending.then(pushCurrent);
    }
    await pending;
  }

  return Object.freeze({
    async initialize() {
      if (disposed) throw new Error('State sync is disposed.');
      if (!initialized) {
        await reconcile();
        if (state.status === 'poisoned') {
          throw new StateSyncPoisonedError(
            'State synchronization requires a page reload before application initialization.',
          );
        }
        initialized = true;
      }
      return publicSnapshot(state);
    },
    storage,
    snapshot: () => publicSnapshot(state),
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('State sync listener must be a function.');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async retry() {
      if (disposed || state.status === 'poisoned') return publicSnapshot(state);
      await reconcile();
      return publicSnapshot(state);
    },
    async resolveConflict(strategy) {
      if (state.status !== 'conflict' || remoteConflict === null) return false;
      if (strategy === 'server') {
        try {
          await hydrateRemote(remoteConflict, { backupDevice: true });
          options.reload();
          return true;
        } catch (error) {
          if (isStateSnapshotRollbackError(error)) {
            poison(error);
            return false;
          }
          publish({
            message: `Server copy could not be applied; this device was restored. ${error.message}`,
            status: 'conflict',
          });
          return false;
        }
      }
      if (strategy === 'device') {
        const localEntries = captureReplicatedEntries(rawStorage);
        writeConflictBackup(rawStorage, 'server', remoteConflict, options.now());
        try {
          const accepted = await upload(localEntries, remoteConflict.revision);
          if (accepted) options.reload();
          return accepted;
        } catch (error) {
          publish({ message: error.message, status: 'offline' });
          return false;
        }
      }
      throw new TypeError('Conflict strategy must be server or device.');
    },
    flush,
    async dispose() {
      if (disposed) return;
      if (state.status !== 'poisoned') await flush();
      disposed = true;
      listeners.clear();
    },
  });
}
