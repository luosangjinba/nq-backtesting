export const REPLAY_SESSION_STATUS = Object.freeze({
  DRAFT: 'draft',
  READY: 'ready',
  ACTIVE: 'active',
  COMPLETE: 'complete',
  ARCHIVED: 'archived',
});

const SESSION_STATUSES = new Set(Object.values(REPLAY_SESSION_STATUS));

function nowIso() {
  return new Date().toISOString();
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function requiredText(value, fieldName) {
  const normalized = text(value);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function positiveInteger(value, fallback, fieldName) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  if (fallback !== undefined) return fallback;
  throw new Error(`${fieldName} must be a positive integer.`);
}

function isoTimestamp(value, fieldName, { required = true } = {}) {
  const normalized = text(value);
  if (!normalized && !required) return null;
  if (!normalized) throw new Error(`${fieldName} is required.`);
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function createdUpdated(input = {}) {
  const createdAt = isoTimestamp(input.createdAt || nowIso(), 'createdAt');
  const updatedAt = isoTimestamp(input.updatedAt || createdAt, 'updatedAt');
  return { createdAt, updatedAt };
}

export function normalizeUser(input = {}) {
  const { createdAt, updatedAt } = createdUpdated(input);
  return {
    id: requiredText(input.id, 'user.id'),
    name: text(input.name, 'Default User'),
    email: text(input.email, ''),
    createdAt,
    updatedAt,
  };
}

export function normalizeWorkspace(input = {}) {
  const { createdAt, updatedAt } = createdUpdated(input);
  return {
    id: requiredText(input.id, 'workspace.id'),
    userId: requiredText(input.userId, 'workspace.userId'),
    name: text(input.name, 'Default Workspace'),
    createdAt,
    updatedAt,
  };
}

export function normalizeReplaySession(input = {}) {
  const { createdAt, updatedAt } = createdUpdated(input);
  const sessionStart = isoTimestamp(input.sessionStart, 'session.sessionStart');
  const sessionEnd = isoTimestamp(input.sessionEnd, 'session.sessionEnd');
  if (Date.parse(sessionStart) >= Date.parse(sessionEnd)) {
    throw new Error('session.sessionStart must be before session.sessionEnd.');
  }

  const status = SESSION_STATUSES.has(input.status)
    ? input.status
    : REPLAY_SESSION_STATUS.DRAFT;

  return {
    id: requiredText(input.id, 'session.id'),
    userId: requiredText(input.userId, 'session.userId'),
    workspaceId: requiredText(input.workspaceId, 'session.workspaceId'),
    instrument: requiredText(input.instrument, 'session.instrument').toUpperCase(),
    timeframe: positiveInteger(input.timeframe, undefined, 'session.timeframe'),
    sessionStart,
    sessionEnd,
    status,
    createdAt,
    updatedAt,
  };
}

export function normalizeReplayCursor(input = {}) {
  const updatedAt = isoTimestamp(input.updatedAt || nowIso(), 'cursor.updatedAt');
  return {
    sessionId: requiredText(input.sessionId, 'cursor.sessionId'),
    startBarTimestamp: isoTimestamp(input.startBarTimestamp, 'cursor.startBarTimestamp', {
      required: false,
    }),
    cursorTimestamp: isoTimestamp(input.cursorTimestamp, 'cursor.cursorTimestamp', {
      required: false,
    }),
    revealedCount: positiveInteger(input.revealedCount, 0, 'cursor.revealedCount'),
    updatedAt,
  };
}

export function assertSessionBelongsToWorkspace(session, workspace) {
  if (session.workspaceId !== workspace.id || session.userId !== workspace.userId) {
    throw new Error('Replay session must belong to the same user/workspace.');
  }
}

export function assertWorkspaceBelongsToUser(workspace, user) {
  if (workspace.userId !== user.id) {
    throw new Error('Workspace must belong to user.');
  }
}
