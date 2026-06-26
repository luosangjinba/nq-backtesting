import assert from 'node:assert/strict';
import {
  loadReplayWindowChunks,
  mergeReplayChunkBars,
  resolveReplayChunks,
} from '../src/data/replay-chunk-loader.js';

const windowRange = {
  start: '2012-01-02 09:30',
  end: '2012-01-06 09:30',
  startTs: 1325496600,
  endTs: 1325842200,
  timeframe: 1,
};

const chunks = resolveReplayChunks(windowRange);
assert.equal(chunks.length, 5);
assert.equal(chunks[0].start, '2012-01-02 09:30');
assert.equal(chunks[0].end, '2012-01-03 00:00');
assert.equal(chunks.at(-1).start, '2012-01-06 00:00');
assert.equal(chunks.at(-1).end, '2012-01-06 09:30');

const exactBoundaryChunks = resolveReplayChunks({
  start: '2026-05-31 00:00',
  end: '2026-06-04 00:00',
  startTs: 1780185600,
  endTs: 1780531200,
  timeframe: 1,
});
assert.equal(exactBoundaryChunks.length, 4);
assert.equal(exactBoundaryChunks.at(-1).start, '2026-06-03 00:00');
assert.equal(exactBoundaryChunks.at(-1).end, '2026-06-04 00:00');
assert.ok(exactBoundaryChunks.every((chunk) => chunk.endTs > chunk.startTs));

const merged = mergeReplayChunkBars([
  { bars: [{ timestamp: 3, close: 3 }, { timestamp: 1, close: 1 }] },
  { bars: [{ timestamp: 2, close: 2 }, { timestamp: 3, close: 30 }] },
]);
assert.deepEqual(merged.map((bar) => [bar.timestamp, bar.close]), [[1, 1], [2, 2], [3, 30]]);

const calls = [];
const loaded = await loadReplayWindowChunks({
  instrument: 'NQ',
  windowRange,
  loadWindow: async (start, end, timeframe, instrument) => {
    calls.push({ start, end, timeframe, instrument });
    return {
      result: {
        bars: [{ timestamp: calls.length, close: calls.length }],
        requestedRange: null,
      },
      cacheHit: calls.length > 1,
      cacheKey: `${instrument}|${timeframe}|${start}|${end}`,
    };
  },
});
assert.equal(calls.length, chunks.length);
assert.equal(loaded.loadedChunks.length, chunks.length);
assert.equal(loaded.bars.length, chunks.length);
assert.equal(loaded.loadedChunks[1].cacheHit, true);

console.log('replay chunk loader smoke passed');
