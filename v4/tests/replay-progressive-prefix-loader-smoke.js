import assert from 'node:assert/strict';
import {
  loadReplayPrefixChunk,
  resetReplayProgressivePrefixLoaderForTests,
  resolveReplayPrefixWindow,
} from '../src/data/replay-progressive-prefix-loader.js';
import {
  clearBars,
  getBars,
  getCurrentRange,
  setBars,
} from '../src/data/bar-store.js';

clearBars();
resetReplayProgressivePrefixLoaderForTests();
setBars(
  [
    { timestamp: 1325496600, close: 100 },
    { timestamp: 1325496660, close: 101 },
  ],
  '2012-01-02 09:30',
  '2012-01-02 09:31',
  1,
  null,
  {
    outerRange: {
      start: '2012-01-02 09:30',
      end: '2012-12-31 23:59',
      timeframe: 1,
    },
    instrument: 'NQ',
  }
);

const window = resolveReplayPrefixWindow('2012-01-02 09:30');
assert.equal(window.start, '2012-01-02 07:30');
assert.equal(window.end, '2012-01-02 09:30');

const calls = [];
const loaded = await loadReplayPrefixChunk({
  instrument: 'NQ',
  loadWindow: async (start, end, timeframe, instrument) => {
    calls.push({ start, end, timeframe, instrument });
    return {
      result: {
        bars: [
          { timestamp: 1325496480, close: 98 },
          { timestamp: 1325496540, close: 99 },
        ],
      },
      cacheHit: true,
    };
  },
});

assert.equal(loaded.ok, true);
assert.equal(loaded.cacheHit, true);
assert.equal(loaded.addedBars, 2);
assert.deepEqual(calls[0], {
  start: '2012-01-02 07:30',
  end: '2012-01-02 09:30',
  timeframe: 1,
  instrument: 'NQ',
});
assert.deepEqual(getBars().map((bar) => bar.close), [98, 99, 100, 101]);
assert.equal(getCurrentRange().start, '2012-01-02 07:30');

clearBars();
resetReplayProgressivePrefixLoaderForTests();
setBars(
  [
    { timestamp: 1325494800, close: 200 },
    { timestamp: 1325498400, close: 201 },
  ],
  '2012-01-02 09:00',
  '2012-01-02 10:00',
  60,
  null,
  {
    outerRange: {
      start: '2012-01-02 09:00',
      end: '2012-02-01 09:00',
      timeframe: 60,
    },
    instrument: 'NQ',
  }
);

const hourlyWindow = resolveReplayPrefixWindow('2012-01-02 09:00');
assert.equal(hourlyWindow.timeframe, 60);
assert.equal(hourlyWindow.start, '2011-12-28 09:00');

console.log('replay progressive prefix loader smoke passed');
