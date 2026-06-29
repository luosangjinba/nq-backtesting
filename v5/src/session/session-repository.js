import { bootstrapDefaultWorkspace } from '../domain/default-workspace.js';
import {
  REPLAY_SESSION_STATUS,
  assertSessionBelongsToWorkspace,
  normalizeReplayCursor,
  normalizeReplaySession,
} from '../domain/session-model.js';

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`;
}

function clone(value) {
  return structuredClone(value);
}

export function createSessionRepository(seed = {}) {
  const context = bootstrapDefaultWorkspace(seed.defaultContext);
  const sessions = new Map();
  const cursors = new Map();

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

  return {
    getDefaultContext,
    createReplaySession,
    listReplaySessions,
    getReplaySession,
  };
}
