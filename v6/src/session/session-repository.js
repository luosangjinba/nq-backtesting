function cloneSession(session) {
  const cloned = { ...session };
  if (Array.isArray(session.symbols)) {
    cloned.symbols = [...session.symbols];
  }
  return cloned;
}

function cloneSessions(sessions = []) {
  return sessions.map(cloneSession);
}

const EMPTY_SESSION_METADATA_STORE = Object.freeze({
  load() {
    return {
      activeSessionId: null,
      sessions: [],
    };
  },
  save() {},
});

function normalizeStoredState(state = {}) {
  return {
    activeSessionId: state.activeSessionId ? String(state.activeSessionId) : null,
    sessions: cloneSessions(Array.isArray(state.sessions) ? state.sessions.filter((session) => session?.id) : []),
  };
}

export function createInMemorySessionRepository({
  metadataStore = EMPTY_SESSION_METADATA_STORE,
} = {}) {
  const store = metadataStore || EMPTY_SESSION_METADATA_STORE;
  const storedState = normalizeStoredState(
    typeof store.load === 'function' ? store.load() : null,
  );
  const sessionsById = new Map(storedState.sessions.map((session) => [session.id, cloneSession(session)]));
  let activeSessionId = storedState.activeSessionId && sessionsById.has(storedState.activeSessionId)
    ? storedState.activeSessionId
    : null;

  function persist() {
    if (typeof store.save !== 'function') return;
    store.save({
      activeSessionId,
      sessions: [...sessionsById.values()].map(cloneSession),
    });
  }

  function save(session) {
    if (!session?.id) {
      throw new Error('Cannot save a session without an id.');
    }
    sessionsById.set(session.id, cloneSession(session));
    activeSessionId = session.id;
    persist();
    return cloneSession(session);
  }

  function getById(id) {
    const session = sessionsById.get(String(id || '').trim());
    return session ? cloneSession(session) : null;
  }

  function getActive() {
    return activeSessionId ? getById(activeSessionId) : null;
  }

  function open(id) {
    const session = getById(id);
    if (!session) {
      throw new Error(`Session ${String(id || '').trim() || '<missing>'} does not exist.`);
    }
    activeSessionId = session.id;
    persist();
    return cloneSession(session);
  }

  function deleteSession(id) {
    const sessionId = String(id || '').trim();
    const deleted = sessionsById.delete(sessionId);
    if (!deleted) {
      return {
        activeSessionId,
        deleted: false,
        id: sessionId,
      };
    }
    if (activeSessionId === sessionId) {
      activeSessionId = null;
    }
    persist();
    return {
      activeSessionId,
      deleted: true,
      id: sessionId,
    };
  }

  function list() {
    return [...sessionsById.values()].map(cloneSession);
  }

  function clear() {
    sessionsById.clear();
    activeSessionId = null;
    persist();
  }

  return {
    clear,
    delete: deleteSession,
    getActive,
    getById,
    list,
    open,
    save,
  };
}
