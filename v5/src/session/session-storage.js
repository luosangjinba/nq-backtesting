const STORAGE_VERSION = 1;

function emptySnapshot() {
  return {
    version: STORAGE_VERSION,
    sessions: [],
    cursors: [],
  };
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return emptySnapshot();
  return {
    version: STORAGE_VERSION,
    sessions: Array.isArray(snapshot.sessions) ? snapshot.sessions : [],
    cursors: Array.isArray(snapshot.cursors) ? snapshot.cursors : [],
  };
}

export function createMemorySessionStorage(initialSnapshot = null) {
  let snapshot = normalizeSnapshot(initialSnapshot);
  return {
    load() {
      return structuredClone(snapshot);
    },
    save(nextSnapshot) {
      snapshot = normalizeSnapshot(nextSnapshot);
    },
  };
}

export function createLocalSessionStorage({
  key = 'v5:session-store',
  storage = globalThis.localStorage,
} = {}) {
  return {
    load() {
      if (!storage) return emptySnapshot();
      try {
        return normalizeSnapshot(JSON.parse(storage.getItem(key)));
      } catch {
        return emptySnapshot();
      }
    },
    save(nextSnapshot) {
      if (!storage) return;
      storage.setItem(key, JSON.stringify(normalizeSnapshot(nextSnapshot)));
    },
  };
}
