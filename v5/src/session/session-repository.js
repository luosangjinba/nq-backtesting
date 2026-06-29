import { bootstrapDefaultWorkspace } from '../domain/default-workspace.js';
import {
  REPLAY_SESSION_STATUS,
  assertSessionBelongsToWorkspace,
  normalizeReplayCursor,
  normalizeReplaySession,
} from '../domain/session-model.js';
import { createMemorySessionStorage } from './session-storage.js';

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`;
}

function clone(value) {
  return structuredClone(value);
}

export function createSessionRepository(options = {}) {
  const context = bootstrapDefaultWorkspace(options.defaultContext);
  const storage = options.storage || createMemorySessionStorage(options.initialSnapshot);
  const snapshot = storage.load();
  const sessions = new Map();
  const cursors = new Map();

  for (const session of snapshot.sessions || []) {
    const normalized = normalizeReplaySession(session);
    assertSessionBelongsToWorkspace(normalized, context.workspace);
    sessions.set(normalized.id, normalized);
  }
  for (const cursor of snapshot.cursors || []) {
    const normalized = normalizeReplayCursor(cursor);
    if (sessions.has(normalized.sessionId)) {
      cursors.set(normalized.sessionId, normalized);
    }
  }

  function persist() {
    storage.save({
      sessions: [...sessions.values()],
      cursors: [...cursors.values()],
    });
  }

  function getDefaultContext() {
    return clone(context);
  }

  function createReplaySession(input = {}) {
    const session = normalizeReplaySession({
      id: input.id || createId('session'),
      userId: context.user.id,
      workspaceId: context.workspace.id,
      status: REPLAY_SESSION_STATUS.READY,
      ...input,
      userId: context.user.id,
      workspaceId: context.workspace.id,
    });
    assertSessionBelongsToWorkspace(session, context.workspace);

    const cursor = normalizeReplayCursor({
      sessionId: session.id,
      revealedCount: 0,
    });
    sessions.set(session.id, session);
    cursors.set(session.id, cursor);
    persist();
    return clone({ session, cursor });
  }

  function listReplaySessions() {
    return [...sessions.values()]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .map((session) => clone(session));
  }

  function getReplaySession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;
    return clone({
      session,
      cursor: cursors.get(sessionId) || null,
    });
  }

  function updateReplayCursor(input = {}) {
    const session = sessions.get(input.sessionId);
    if (!session) {
      throw new Error(`Replay session "${input.sessionId}" was not found.`);
    }
    const previous = cursors.get(session.id) || { sessionId: session.id };
    const cursor = normalizeReplayCursor({
      ...previous,
      ...input,
      sessionId: session.id,
      updatedAt: input.updatedAt || new Date().toISOString(),
    });
    cursors.set(session.id, cursor);
    persist();
    return clone({
      session,
      cursor,
    });
  }

  return {
    getDefaultContext,
    createReplaySession,
    listReplaySessions,
    getReplaySession,
    updateReplayCursor,
  };
}
