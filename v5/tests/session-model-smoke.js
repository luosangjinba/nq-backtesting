import assert from 'node:assert/strict';
import {
  REPLAY_SESSION_STATUS,
  assertSessionBelongsToWorkspace,
  assertWorkspaceBelongsToUser,
  normalizeReplayCursor,
  normalizeReplaySession,
  normalizeUser,
  normalizeWorkspace,
} from '../src/domain/session-model.js';

const user = normalizeUser({
  id: 'user-default',
  name: 'Default User',
});
assert.equal(user.id, 'user-default');
assert.equal(user.name, 'Default User');

const workspace = normalizeWorkspace({
  id: 'workspace-default',
  userId: user.id,
  name: 'Replay Workspace',
});
assertWorkspaceBelongsToUser(workspace, user);

const session = normalizeReplaySession({
  id: 'session-1',
  userId: user.id,
  workspaceId: workspace.id,
  instrument: 'nq',
  timeframe: 1,
  sessionStart: '2026-06-01T00:00:00.000Z',
  sessionEnd: '2026-06-05T00:00:00.000Z',
  status: REPLAY_SESSION_STATUS.READY,
});
assert.equal(session.instrument, 'NQ');
assert.equal(session.status, REPLAY_SESSION_STATUS.READY);
assertSessionBelongsToWorkspace(session, workspace);

const cursor = normalizeReplayCursor({
  sessionId: session.id,
  revealedCount: 0,
});
assert.equal(cursor.sessionId, session.id);
assert.equal(cursor.revealedCount, 0);
assert.equal(cursor.startBarTimestamp, null);
assert.equal(cursor.cursorTimestamp, null);

assert.throws(() => normalizeUser({}), /user.id/);
assert.throws(() => normalizeWorkspace({ id: 'workspace-bad' }), /workspace.userId/);
assert.throws(() => normalizeReplaySession({
  id: 'session-bad',
  userId: user.id,
  workspaceId: workspace.id,
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-05T00:00:00.000Z',
  sessionEnd: '2026-06-01T00:00:00.000Z',
}), /before/);
assert.throws(() => assertWorkspaceBelongsToUser({
  ...workspace,
  userId: 'other-user',
}, user), /belong/);

console.log('v5 session model smoke passed');
