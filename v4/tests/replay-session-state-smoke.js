import assert from 'node:assert/strict';
import {
  REPLAY_SESSION_CHUNK_REASONS,
  addReplaySessionChunk,
  clearActiveReplaySession,
  createReplaySession,
  formatReplaySessionDateTime,
  getActiveReplaySession,
  hasActiveReplaySession,
  parseReplaySessionDateTime,
  planInitialPrefixRequest,
  planNextForwardBarRequest,
  planPreviousPrefixRequest,
  resetReplaySession,
  serializeReplaySession,
  setActiveReplaySession,
  updateActiveReplaySession,
  updateReplaySession,
} from '../src/ui/replay/replay-session-state.js';
import { getReplaySessionVisibleBarsFromResult } from '../src/ui/replay/replay-session-loader.js';

const session = createReplaySession({
  instrument: 'nq',
  timeframe: 1,
  sessionStart: '2026-06-01 21:55',
  sessionEnd: '2026-06-25 21:55',
});

assert.equal(session.active, true);
assert.equal(session.instrument, 'NQ');
assert.equal(session.cursor, parseReplaySessionDateTime('2026-06-01 21:55'));
assert.equal(formatReplaySessionDateTime(session.cursor), '2026-06-01 21:55');

const initial = planInitialPrefixRequest(session, { viewportBarCapacity: 5, paddingBars: 1 });
assert.equal(initial.ok, true);
assert.equal(initial.request.reason, REPLAY_SESSION_CHUNK_REASONS.INITIAL_PREFIX);
assert.equal(initial.request.end, '2026-06-01 21:55');
assert.equal(initial.request.start, '2026-06-01 21:50');
assert.equal(initial.request.endTs, session.cursor);
assert.ok(initial.request.startTs < session.sessionStart);

const withInitialChunk = addReplaySessionChunk(session, {
  reason: initial.request.reason,
  startTs: initial.request.startTs,
  endTs: initial.request.endTs,
});
assert.equal(withInitialChunk.loadedChunks.length, 1);
assert.equal(withInitialChunk.dataEarliestTimestamp, initial.request.startTs);
assert.equal(withInitialChunk.dataLatestLoadedTimestamp, initial.request.endTs);

const previous = planPreviousPrefixRequest(withInitialChunk, { chunkBars: 3 });
assert.equal(previous.ok, true);
assert.equal(previous.request.reason, REPLAY_SESSION_CHUNK_REASONS.PREVIOUS_PREFIX);
assert.equal(previous.request.endTs, initial.request.startTs - 60);
assert.equal(previous.request.startTs, initial.request.startTs - 180);
assert.ok(previous.request.endTs < session.cursor);

const forward = planNextForwardBarRequest(session);
assert.equal(forward.ok, true);
assert.equal(forward.request.reason, REPLAY_SESSION_CHUNK_REASONS.NEXT_FORWARD_BAR);
assert.equal(forward.request.start, '2026-06-01 21:56');
assert.equal(forward.request.end, '2026-06-01 21:56');

const moved = updateReplaySession(session, { cursor: forward.request.startTs });
assert.equal(moved.cursor, forward.request.startTs);
const nextForward = planNextForwardBarRequest(moved);
assert.equal(nextForward.request.start, '2026-06-01 21:57');
const movedInitial = planInitialPrefixRequest(moved, { viewportBarCapacity: 2, paddingBars: 0 });
assert.equal(movedInitial.request.end, '2026-06-01 21:56');
assert.equal(movedInitial.request.start, '2026-06-01 21:55');

const finished = createReplaySession({
  ...session,
  cursor: session.sessionEnd,
});
const finishedForward = planNextForwardBarRequest(finished);
assert.equal(finishedForward.ok, false);
assert.equal(finishedForward.finished, true);

assert.throws(
  () => createReplaySession({ sessionStart: '2026-06-02 00:00', sessionEnd: '2026-06-01 00:00' }),
  /sessionStart/
);

const serialized = serializeReplaySession(withInitialChunk);
assert.deepEqual(serialized.loadedChunks, withInitialChunk.loadedChunks);
serialized.loadedChunks[0].startTs = 1;
assert.notEqual(serialized.loadedChunks[0].startTs, withInitialChunk.loadedChunks[0].startTs);
assert.equal(resetReplaySession(), null);

assert.equal(hasActiveReplaySession(), false);
const active = setActiveReplaySession(session);
assert.equal(hasActiveReplaySession(), true);
assert.equal(active.cursor, session.cursor);
const activeCopy = getActiveReplaySession();
activeCopy.cursor = 1;
assert.equal(getActiveReplaySession().cursor, session.cursor);
const updatedActive = updateActiveReplaySession({ cursor: forward.request.startTs });
assert.equal(updatedActive.cursor, forward.request.startTs);
clearActiveReplaySession();
assert.equal(hasActiveReplaySession(), false);

const filteredBars = getReplaySessionVisibleBarsFromResult({
  bars: [
    { timestamp: initial.request.startTs - 60, close: 1 },
    { timestamp: initial.request.startTs, close: 2 },
    { timestamp: session.cursor, close: 3 },
    { timestamp: session.cursor + 60, close: 4 },
  ],
}, initial.request);
assert.deepEqual(filteredBars.map((bar) => bar.close), [2, 3]);

console.log('replay session state smoke passed');
