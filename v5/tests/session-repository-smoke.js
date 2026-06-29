import assert from 'node:assert/strict';
import { DEFAULT_USER_ID, DEFAULT_WORKSPACE_ID } from '../src/domain/default-workspace.js';
import { REPLAY_SESSION_STATUS } from '../src/domain/session-model.js';
import { createSessionRepository } from '../src/session/session-repository.js';

const repository = createSessionRepository();
const context = repository.getDefaultContext();
assert.equal(context.user.id, DEFAULT_USER_ID);
assert.equal(context.workspace.id, DEFAULT_WORKSPACE_ID);
assert.equal(context.workspace.userId, context.user.id);

const created = repository.createReplaySession({
  id: 'session-test',
  userId: 'wrong-user',
  workspaceId: 'wrong-workspace',
  instrument: 'nq',
  timeframe: 1,
  sessionStart: '2026-06-01T00:00:00.000Z',
  sessionEnd: '2026-06-05T00:00:00.000Z',
});

assert.equal(created.session.id, 'session-test');
assert.equal(created.session.userId, DEFAULT_USER_ID);
assert.equal(created.session.workspaceId, DEFAULT_WORKSPACE_ID);
assert.equal(created.session.instrument, 'NQ');
assert.equal(created.session.status, REPLAY_SESSION_STATUS.READY);
assert.equal(created.cursor.sessionId, created.session.id);

const fetched = repository.getReplaySession('session-test');
assert.deepEqual(fetched, created);
assert.equal(repository.getReplaySession('missing'), null);

const listed = repository.listReplaySessions();
assert.equal(listed.length, 1);
assert.equal(listed[0].id, 'session-test');

created.session.instrument = 'ES';
assert.equal(repository.getReplaySession('session-test').session.instrument, 'NQ');

console.log('v5 session repository smoke passed');
