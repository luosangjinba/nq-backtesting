import assert from 'node:assert/strict';
import { loadReplayFirstWindow } from '../src/data/replay-first-loader.js';

const calls = [];
const replay = await loadReplayFirstWindow({
  start: '2012-01-01 00:00',
  end: '2012-12-31 23:59',
  timeframe: 1,
  instrument: 'NQ',
  loadWindow: async (start, end, timeframe, instrument) => {
    calls.push({ start, end, timeframe, instrument });
    const timestamp = calls.length === 1 ? 1325496600 : 1325583000 + calls.length;
    return {
      result: {
        bars: [{ timestamp, close: calls.length }],
      },
      cacheHit: false,
    };
  },
});

assert.equal(replay.ok, true);
assert.equal(replay.outerRange.start, '2012-01-01 00:00');
assert.equal(replay.outerRange.end, '2012-12-31 23:59');
assert.equal(replay.windowRange.start, '2011-12-31 00:00');
assert.equal(replay.windowRange.end, '2012-01-04 00:00');
assert.equal(replay.loadedChunks.length, 5);
assert.equal(calls.length, 5);
assert.equal(calls[0].instrument, 'NQ');
assert.equal(calls[0].timeframe, 1);
assert.equal(replay.activationTimestamp, 1325496600);
assert.equal(replay.bars.length, 5);

console.log('replay first loader smoke passed');
