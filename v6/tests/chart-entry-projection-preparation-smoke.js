import assert from 'node:assert/strict';
import { createChartEntryProjectionPreparation } from '../src/chart-entry/chart-entry-projection-preparation.js';

const bars = Array.from({ length: 5 }, (_, index) => ({
  close: 100 + index,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));
const plan = {
  anchor: '2026-06-01T09:30:00.000Z',
  context: {
    loadedWindow: {
      bounded: true,
      end: '2026-06-01 09:30',
      estimatedBars: 5,
      instrument: 'NQ',
      start: '2026-06-01 09:26',
      timeframe: 1,
    },
    plannedWindow: {
      bounded: true,
      end: '2026-06-01 09:30',
      estimatedBars: 5,
      instrument: 'NQ',
      start: '2026-06-01 09:26',
      timeframe: 1,
    },
    record: {
      barCount: 5,
      cacheHit: false,
      key: 'NQ|1|2026-06-01 09:26|2026-06-01 09:30',
    },
  },
  cursorTime: new Date((1780306200 + (4 * 60)) * 1000).toISOString(),
  latestOffsetBars: 12,
  paneId: 'main',
  prefixBars: 120,
  sessionId: 'session-projection',
  spanBars: 80,
};
const cacheRecord = {
  bars,
  bounded: true,
  cacheHit: true,
  end: '2026-06-01 09:30',
  estimatedBars: 5,
  instrument: 'NQ',
  key: 'NQ|1|2026-06-01 09:26|2026-06-01 09:30',
  start: '2026-06-01 09:26',
  timeframe: 1,
};

const prepared = createChartEntryProjectionPreparation(plan, cacheRecord);
assert.equal(prepared.owner, 'runtime.chartEntryProjectionPreparation');
assert.equal(prepared.status, 'prepared');
assert.equal(prepared.sessionId, 'session-projection');
assert.equal(prepared.chartReplacePayload.paneId, 'main');
assert.equal(prepared.chartReplacePayload.bars.length, 5);
assert.equal(prepared.chartReplacePayload.cursorTimestamp, bars.at(-1).timestamp);
assert.deepEqual(prepared.viewportIntentPayload, {
  cursorTimestamp: bars.at(-1).timestamp,
  latestOffsetBars: 12,
  paneId: 'main',
});
assert.equal(prepared.wallState.chartBarCount, 5);
assert.equal(prepared.wallState.forwardBarCount, 0);
assert.equal(prepared.wallState.projection.latestLogicalIndex, 4);
assert.equal(prepared.source.barCount, 5);
assert.equal('bars' in prepared.source, false);
assert.equal('bars' in prepared.source.window, false);
assert.notEqual(prepared.chartReplacePayload.bars[0], bars[0]);

assert.throws(
  () => createChartEntryProjectionPreparation(plan, { ...cacheRecord, bars: [] }),
  /requires cached bars/,
);
assert.throws(
  () => createChartEntryProjectionPreparation(null, cacheRecord),
  /plan is required/,
);

console.log('v6 chart entry projection preparation smoke passed');
