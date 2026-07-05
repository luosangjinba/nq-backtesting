import assert from 'node:assert/strict';
import {
  createReplaySession,
  getDefaultSessionInput,
  resetSessionIdsForTest,
} from '../src/session/session-domain.js';
import { createInMemorySessionRepository } from '../src/session/session-repository.js';

resetSessionIdsForTest();

const defaults = getDefaultSessionInput();
assert.deepEqual(defaults, {
  endTime: '2026-06-05T16:00:00.000Z',
  profileId: 'default-profile',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
  workspaceId: 'default-workspace',
});

const session = createReplaySession({
  createdAt: '2026-07-04T00:00:00.000Z',
});
assert.deepEqual(session, {
  createdAt: '2026-07-04T00:00:00.000Z',
  endTime: defaults.endTime,
  id: 'v6-session-0001',
  profileId: defaults.profileId,
  startTime: defaults.startTime,
  status: 'created',
  symbol: defaults.symbol,
  timeframe: defaults.timeframe,
  workspaceId: defaults.workspaceId,
});

const custom = createReplaySession({
  createdAt: '2026-07-04T00:00:01.000Z',
  endTime: '2026-06-02T16:00:00-04:00',
  profileId: 'fx-profile',
  startTime: '2026-06-02T09:30:00-04:00',
  symbol: 'ES',
  timeframe: '5m',
  workspaceId: 'main-workspace',
});
assert.equal(custom.id, 'v6-session-0002');
assert.equal(custom.startTime, '2026-06-02T13:30:00.000Z');
assert.equal(custom.endTime, '2026-06-02T20:00:00.000Z');

assert.throws(
  () => createReplaySession({ startTime: '2026-06-02T10:00:00Z', endTime: '2026-06-02T10:00:00Z' }),
  /startTime must be before endTime/
);

const repository = createInMemorySessionRepository();
const saved = repository.save(session);
saved.symbol = 'MUTATED';
assert.equal(repository.getActive().symbol, 'NQ');
assert.equal(repository.getById(session.id).id, session.id);
assert.equal(repository.list().length, 1);
repository.clear();
assert.equal(repository.getActive(), null);

console.log('v6 session domain smoke passed');
