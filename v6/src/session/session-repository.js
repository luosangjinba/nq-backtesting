function cloneSession(session) {
  return { ...session };
}

export function createInMemorySessionRepository() {
  const sessionsById = new Map();
  let activeSessionId = null;

  function save(session) {
    if (!session?.id) {
      throw new Error('Cannot save a session without an id.');
    }
    sessionsById.set(session.id, cloneSession(session));
    activeSessionId = session.id;
    return cloneSession(session);
  }

  function getById(id) {
    const session = sessionsById.get(String(id || '').trim());
    return session ? cloneSession(session) : null;
  }

  function getActive() {
    return activeSessionId ? getById(activeSessionId) : null;
  }

  function list() {
    return [...sessionsById.values()].map(cloneSession);
  }

  function clear() {
    sessionsById.clear();
    activeSessionId = null;
  }

  return {
    clear,
    getActive,
    getById,
    list,
    save,
  };
}
