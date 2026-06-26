import assert from 'node:assert/strict';
import {
  loadReplayForwardChunk,
  resetReplayProgressiveForwardLoaderForTests,
  resolveReplayForwardWindow,
} from '../src/data/replay-progressive-forward-loader.js';
import {
  clearBars,
  getBars,
  getCurrentRange,
  setBars,
} from '../src/data/bar-store.js';

clearBars();
resetReplayProgressiveForwardLoaderForTests();
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

const forwardWindow = resolveReplayForwardWindow(
  '2012-01-02 09:30',
  {
    start: '2012-01-01 00:00',
    end: '2012-12-31 23:59',
    timeframe: 1,
  }
);
assert.equal(forwardWindow.start, '2012-01-02 09:30');
assert.equal(forwardWindow.end, '2012-01-02 11:30');

const calls = [];
const loaded = await loadReplayForwardChunk({
  instrument: 'NQ',
  loadWindow: async (start, end, timeframe, instrument) => {
    calls.push({ start, end, timeframe, instrument });
    return {
      result: {
        bars: [
          { timestamp: 1325496660, close: 1010 },
          { timestamp: 1325496720, close: 102 },
        ],
      },
      cacheHit: true,
    };
  },
});

assert.equal(loaded.ok, true);
assert.equal(loaded.cacheHit, true);
assert.equal(loaded.addedBars, 1);
assert.deepEqual(calls[0], {
  start: '2012-01-02 09:31',
  end: '2012-01-02 11:31',
  timeframe: 1,
  instrument: 'NQ',
});
assert.deepEqual(getBars().map((bar) => bar.close), [100, 1010, 102]);
assert.equal(getCurrentRange().end, '2012-01-02 11:31');

clearBars();
resetReplayProgressiveForwardLoaderForTests();
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

const hourlyWindow = resolveReplayForwardWindow(
  '2012-01-02 10:00',
  {
    start: '2012-01-02 09:00',
    end: '2012-02-01 09:00',
    timeframe: 60,
  }
);
assert.equal(hourlyWindow.timeframe, 60);
assert.equal(hourlyWindow.end, '2012-01-07 10:00');

console.log('replay progressive forward loader smoke passed');
