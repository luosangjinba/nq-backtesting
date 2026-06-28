import assert from 'node:assert/strict';
import {
  addFxReplayLoaderCacheChunk,
  applyFxReplayPrefixBars,
  applyFxReplayStartBar,
  assertFxReplayBarsDoNotExceedCursor,
  assertFxReplayInitialInvariants,
  createFxReplaySessionState,
  getFxReplayInitialDisplayBars,
} from '../src/features/fx-replay/fx-replay-model.js';
import { startFxReplayInitialSession } from '../src/features/fx-replay/fx-replay-controller.js';

const startTimestamp = Date.UTC(2025, 5, 1, 18, 0) / 1000;

const state = createFxReplaySessionState({
  sessionId: 'guard-state',
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
});
applyFxReplayStartBar(state, { timestamp: startTimestamp, open: 1, high: 2, low: 1, close: 2 });
applyFxReplayPrefixBars(state, [
  { timestamp: startTimestamp - 60, open: 1, high: 1, low: 1, close: 1 },
  { timestamp: startTimestamp + 60, open: 3, high: 3, low: 3, close: 3 },
]);
addFxReplayLoaderCacheChunk(state, 'reveal', {
  bars: [
    { timestamp: startTimestamp + 60, open: 3, high: 3, low: 3, close: 3 },
    { timestamp: startTimestamp + 120, open: 4, high: 4, low: 4, close: 4 },
  ],
});

const initialDisplay = getFxReplayInitialDisplayBars(state);
assert.deepEqual(initialDisplay.map((bar) => bar.timestamp), [startTimestamp - 60, startTimestamp]);
assert.equal(assertFxReplayInitialInvariants(state), true);
assert.equal(assertFxReplayBarsDoNotExceedCursor(initialDisplay, state.cursorTimestamp, 'guard display'), true);
assert.throws(
  () => assertFxReplayBarsDoNotExceedCursor([
    ...initialDisplay,
    { timestamp: startTimestamp + 60, open: 3, high: 3, low: 3, close: 3 },
  ], state.cursorTimestamp, 'guard projection'),
  /must not include future bars after cursor/
);

let projectedBars = null;
await startFxReplayInitialSession({
  sessionId: 'guard-controller',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
  viewport: { viewportWidthPx: 12, barSpacingPx: 6 },
  prefixBufferBars: 0,
  loadBars: async (request) => {
    if (request.type === 'start-resolve') {
      return {
        bars: [
          { timestamp: startTimestamp, open: 1, high: 2, low: 1, close: 2 },
          { timestamp: startTimestamp + 60, open: 3, high: 3, low: 3, close: 3 },
        ],
      };
    }
    return {
      bars: [
        { timestamp: startTimestamp - 120, open: 0, high: 1, low: 0, close: 1 },
        { timestamp: startTimestamp - 60, open: 1, high: 1, low: 1, close: 1 },
        { timestamp: startTimestamp + 60, open: 3, high: 3, low: 3, close: 3 },
      ],
    };
  },
  projectBars: (bars) => {
    projectedBars = bars;
  },
});

assert.deepEqual(projectedBars.map((bar) => bar.timestamp), [
  startTimestamp - 120,
  startTimestamp - 60,
  startTimestamp,
]);
assert.equal(projectedBars.some((bar) => bar.timestamp > startTimestamp), false);

console.log('fx replay no future bars smoke passed');
