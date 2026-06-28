import assert from 'node:assert/strict';
import {
  FX_REPLAY_MODE,
  applyFxReplayPrefixBars,
  applyFxReplayStartBar,
  assertFxReplayInitialInvariants,
  createFxReplaySessionState,
  getFxReplayChangedPayload,
  getFxReplayInitialDisplayBars,
  getFxReplayPrefixRange,
  setFxReplayViewportDemandRange,
} from '../src/features/fx-replay/fx-replay-model.js';

const state = createFxReplaySessionState({
  sessionId: 'session-1',
  instrument: 'nq',
  timeframe: '1',
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
});

assert.equal(state.enabled, false);
assert.equal(state.mode, FX_REPLAY_MODE);
assert.equal(state.instrument, 'NQ');
assert.equal(state.timeframe, 1);

applyFxReplayStartBar(state, {
  timestamp: 1000,
  open: 10,
  high: 12,
  low: 9,
  close: 11,
});
applyFxReplayPrefixBars(state, [
  { timestamp: 940, open: 7, high: 8, low: 6, close: 7 },
  { timestamp: 1060, open: 11, high: 13, low: 10, close: 12 },
  { timestamp: 880, open: 6, high: 7, low: 5, close: 6 },
]);
setFxReplayViewportDemandRange(state, { from: -120, to: 0, requestedPrefixBars: 2 });

const displayBars = getFxReplayInitialDisplayBars(state);
assert.deepEqual(displayBars.map((bar) => bar.timestamp), [880, 940, 1000]);
assert.equal(displayBars.at(-1).timestamp, state.startBarTimestamp);
assert.equal(displayBars.some((bar) => bar.timestamp > state.cursorTimestamp), false);
assert.equal(assertFxReplayInitialInvariants(state), true);

assert.deepEqual(getFxReplayPrefixRange(state), {
  start: 880,
  end: 940,
  count: 2,
});

assert.deepEqual(getFxReplayChangedPayload(state), {
  enabled: true,
  sessionId: 'session-1',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
  startBarTimestamp: 1000,
  cursorTimestamp: 1000,
  prefixRange: {
    start: 880,
    end: 940,
    count: 2,
  },
  revealedCount: 0,
  mode: FX_REPLAY_MODE,
});

const invalidState = createFxReplaySessionState({ sessionId: 'invalid' });
applyFxReplayStartBar(invalidState, { timestamp: 2000, open: 1, high: 1, low: 1, close: 1 });
invalidState.revealedForwardBars = [{ timestamp: 2060, open: 1, high: 1, low: 1, close: 1 }];
assert.throws(
  () => assertFxReplayInitialInvariants(invalidState),
  /must not expose revealed forward bars/
);

console.log('fx replay model smoke passed');
