import assert from 'node:assert/strict';
import { createSessionRepository } from '../src/session/session-repository.js';
import { createMemorySessionStorage } from '../src/session/session-storage.js';

const storage = createMemorySessionStorage();
const writer = createSessionRepository({ storage });
const created = writer.createReplaySession({
  id: 'persistent-session',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T00:00:00.000Z',
  sessionEnd: '2026-06-05T00:00:00.000Z',
});

const reader = createSessionRepository({ storage });
assert.deepEqual(reader.getReplaySession('persistent-session'), created);
assert.equal(reader.listReplaySessions().length, 1);

const snapshot = storage.load();
assert.equal(snapshot.sessions.length, 1);
assert.equal(snapshot.cursors.length, 1);
assert.equal(snapshot.sessions[0].id, 'persistent-session');
assert.equal(snapshot.cursors[0].sessionId, 'persistent-session');

snapshot.sessions[0].instrument = 'ES';
assert.equal(storage.load().sessions[0].instrument, 'NQ');

console.log('v5 session persistence smoke passed');
