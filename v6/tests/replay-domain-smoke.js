import assert from 'node:assert/strict';
import {
  createReplayStateFromSession,
  markReplayPaused,
  markReplayPlaying,
  nextReplayState,
  resetReplayState,
} from '../src/replay/replay-domain.js';

const session = {
  endTime: '2026-06-01T09:33:00.000Z',
  id: 'session-1',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
};

const initial = createReplayStateFromSession(session);
assert.deepEqual(initial, {
  cursorIndex: 0,
  cursorTime: '2026-06-01T09:30:00.000Z',
  endTime: '2026-06-01T09:33:00.000Z',
  revealedCount: 1,
  sessionId: 'session-1',
  startTime: '2026-06-01T09:30:00.000Z',
  status: 'ready',
  symbol: 'NQ',
  timeframe: '1m',
  totalBars: 4,
});

const second = nextReplayState(initial);
assert.equal(second.cursorIndex, 1);
assert.equal(second.cursorTime, '2026-06-01T09:31:00.000Z');
assert.equal(second.revealedCount, 2);
assert.equal(second.status, 'ready');

const ended = [initial, 1, 2, 3, 4, 5].reduce((state) => nextReplayState(state));
assert.equal(ended.cursorTime, session.endTime);
assert.equal(ended.cursorIndex, 3);
assert.equal(ended.revealedCount, 4);
assert.equal(ended.totalBars, 4);
assert.equal(ended.status, 'ended');

assert.equal(markReplayPlaying(second).status, 'playing');
assert.equal(markReplayPaused(second).status, 'paused');
assert.equal(markReplayPlaying(ended), ended);

assert.deepEqual(resetReplayState(ended), initial);

assert.throws(
  () => createReplayStateFromSession({ ...session, timeframe: '1h' }),
  /minute-based/
);
assert.throws(
  () => createReplayStateFromSession({ ...session, startTime: 'bad' }),
  /valid date\/time/
);

console.log('v6 replay domain smoke passed');
