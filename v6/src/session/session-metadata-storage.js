const DEFAULT_STORAGE_KEY = 'v6.sessions.metadata';
const STORAGE_VERSION = 1;

function cloneSession(session = {}) {
  return { ...session };
}

function normalizeSession(session) {
  if (!session?.id) return null;
  return cloneSession(session);
}

function normalizeState(state = {}) {
  const sessions = Array.isArray(state.sessions)
    ? state.sessions.map(normalizeSession).filter(Boolean)
    : [];
  const activeSessionId = state.activeSessionId && sessions.some((session) => session.id === state.activeSessionId)
    ? String(state.activeSessionId)
    : null;
  return {
    activeSessionId,
    sessions,
  };
}

export function createSessionMetadataStorage({
  storage = globalThis?.localStorage,
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) {
  return Object.freeze({
    load() {
      try {
        const parsed = JSON.parse(storage?.getItem?.(storageKey) || 'null');
        if (!parsed || parsed.version !== STORAGE_VERSION) {
          return normalizeState();
        }
        return normalizeState(parsed);
      } catch {
        return normalizeState();
      }
    },
    save(state = {}) {
      const normalized = normalizeState(state);
      storage?.setItem?.(storageKey, JSON.stringify({
        version: STORAGE_VERSION,
        ...normalized,
      }));
    },
  });
}
