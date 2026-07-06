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

  function open(id) {
    const session = getById(id);
    if (!session) {
      throw new Error(`Session ${String(id || '').trim() || '<missing>'} does not exist.`);
    }
    activeSessionId = session.id;
    return cloneSession(session);
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
    open,
    save,
  };
}
