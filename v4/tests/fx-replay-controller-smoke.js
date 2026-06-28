import assert from 'node:assert/strict';
import {
  getActiveFxReplayState,
  startFxReplayInitialSession,
} from '../src/features/fx-replay/fx-replay-controller.js';

const calls = [];
let projected = null;
let enteredMode = null;

const startTimestamp = Date.UTC(2025, 5, 1, 18, 0) / 1000;

const result = await startFxReplayInitialSession({
  sessionId: 'fx-session-1',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
  viewport: {
    viewportWidthPx: 60,
    barSpacingPx: 6,
  },
  prefixBufferBars: 2,
  loadBars: async (request) => {
    calls.push(request);
    if (request.type === 'start-resolve') {
      return {
        bars: [
          { timestamp: startTimestamp, open: 100, high: 101, low: 99, close: 100.5 },
          { timestamp: startTimestamp + 60, open: 101, high: 102, low: 100, close: 101.5 },
        ],
      };
    }
    return {
      bars: [
        { timestamp: startTimestamp - 180, open: 97, high: 98, low: 96, close: 97.5 },
        { timestamp: startTimestamp - 120, open: 98, high: 99, low: 97, close: 98.5 },
        { timestamp: startTimestamp - 60, open: 99, high: 100, low: 98, close: 99.5 },
        { timestamp: startTimestamp + 60, open: 101, high: 102, low: 100, close: 101.5 },
      ],
    };
  },
  projectBars: (bars, options) => {
    projected = { bars, options };
  },
  enterMode: (metadata) => {
    enteredMode = metadata;
  },
});

assert.equal(calls.length, 2);
assert.equal(calls[0].type, 'start-resolve');
assert.equal(calls[0].start, '2025-06-01 18:00');
assert.equal(calls[0].end, '2025-06-01 18:01');
assert.equal(calls[1].type, 'prefix');
assert.equal(calls[1].end, '2025-06-01 17:59');
assert.equal(calls[1].requestedBars, 12);

assert.deepEqual(result.displayBars.map((bar) => bar.timestamp), [
  startTimestamp - 180,
  startTimestamp - 120,
  startTimestamp - 60,
  startTimestamp,
]);
assert.equal(result.displayBars.at(-1).timestamp, startTimestamp);
assert.equal(result.displayBars.some((bar) => bar.timestamp > startTimestamp), false);
assert.deepEqual(projected.bars.map((bar) => bar.timestamp), result.displayBars.map((bar) => bar.timestamp));
assert.equal(projected.options.showEnd, true);
assert.equal(enteredMode.source, 'fx-replay-initial-load');
assert.equal(result.payload.mode, 'fx-replay');
assert.equal(result.payload.revealedCount, 0);
assert.equal(getActiveFxReplayState().sessionId, 'fx-session-1');

console.log('fx replay controller smoke passed');
