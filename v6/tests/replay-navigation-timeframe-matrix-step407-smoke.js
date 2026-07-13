import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { projectSourceBarsToChartData } from '../src/chart-data-projection/chart-data-projection-domain.js';
import { appendReplayCursorAcrossPanes } from '../src/replay/replay-cursor-pane-materializer.js';

const SOURCE_STEP_SECONDS = 60;
const fromCursorTime = '2026-01-15T09:30:00.000Z';
const cursorTime = '2026-03-05T16:00:00.000Z';
const fromTimestamp = Date.parse(fromCursorTime) / 1000;
const cursorTimestamp = Date.parse(cursorTime) / 1000;

const paneTimeframes = Object.freeze({
  daily: '1D',
  fixed: 240,
  main: 1,
  monthly: '1M',
  weekly: '1W',
});

const appended = new Map();
const loadCalls = [];
const projectionCalls = [];

function makeSourceBars({ anchor, count }) {
  const firstTimestamp = Date.parse(anchor) / 1000;
  return Array.from({ length: count }, (_, index) => {
    const timestamp = firstTimestamp + (index * SOURCE_STEP_SECONDS);
    const price = 20_000 + ((timestamp - fromTimestamp) / SOURCE_STEP_SECONDS) / 100;
    return {
      close: price + 0.25,
      high: price + 1,
      low: price - 1,
      open: price,
      timestamp,
    };
  });
}

const result = await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return {
        displayTimeframe: paneTimeframes[payload],
        id: payload,
        instrument: 'NQ',
      };
    }
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      loadCalls.push({ ...payload });
      return {
        bars: makeSourceBars(payload),
        cacheHit: false,
        key: `${payload.anchor}:${payload.count}`,
      };
    }
    if (command === CHART_DATA_PROJECTION_COMMANDS.PROJECT) {
      projectionCalls.push({
        barCount: payload.bars.length,
        paneId: payload.paneId,
        targetTimeframe: payload.targetTimeframe,
      });
      return projectSourceBarsToChartData(payload);
    }
    if (command === CHART_DATA_COMMANDS.APPEND_BARS) {
      appended.set(payload.paneId, {
        bars: payload.bars.map((bar) => ({ ...bar })),
        cursorTimestamp: payload.cursorTimestamp,
        sourceBars: payload.sourceBars.map((bar) => ({ ...bar })),
      });
      return {
        bars: payload.bars.map((bar) => ({ ...bar })),
        paneId: payload.paneId,
      };
    }
    throw new Error(`Unexpected command: ${command}`);
  },
  fromCursorTime,
  hasCommand: (command) => command === CHART_DATA_PROJECTION_COMMANDS.PROJECT,
  paneIds: Object.keys(paneTimeframes),
  replayState: {
    cursorTime,
    startTime: fromCursorTime,
    symbol: 'NQ',
    timeframe: 1,
  },
});

const expectedSourceBarCount = Math.floor((cursorTimestamp - fromTimestamp) / SOURCE_STEP_SECONDS);

assert.equal(result.chartRecords.length, 5);
assert.deepEqual(result.chartRecords.map(({ paneId }) => paneId), Object.keys(paneTimeframes));
assert.equal(result.loadedWindows.length, 5);
assert.equal(result.loadedWindows.every(({ barCount }) => barCount === expectedSourceBarCount), true);
assert.equal(result.loadedWindows.every(({ windowCount }) => windowCount === 2), true);
assert.equal(loadCalls.length, 10, 'each pane uses the same two bounded source chunks');
assert.equal(loadCalls.every(({ direction, timeframe }) => direction === 'forward' && timeframe === 1), true);
assert.equal(loadCalls.every(({ count }) => count > 0 && count <= 40_000), true);

assert.deepEqual(
  projectionCalls.map(({ paneId, targetTimeframe }) => ({ paneId, targetTimeframe })),
  [
    { paneId: 'daily', targetTimeframe: '1D' },
    { paneId: 'fixed', targetTimeframe: 240 },
    { paneId: 'monthly', targetTimeframe: '1M' },
    { paneId: 'weekly', targetTimeframe: '1W' },
  ],
);

const minimumExpectedBars = Object.freeze({
  daily: 40,
  fixed: 250,
  main: expectedSourceBarCount,
  monthly: 2,
  weekly: 6,
});

for (const [paneId, record] of appended) {
  const timestamps = record.bars.map((bar) => Number(bar.timestamp ?? bar.time));
  assert.equal(record.cursorTimestamp, cursorTimestamp);
  assert.equal(record.bars.length >= minimumExpectedBars[paneId], true, `${paneId} should fill its complete projected range`);
  assert.equal(record.sourceBars.length, expectedSourceBarCount);
  assert.equal(timestamps.every((timestamp) => timestamp <= cursorTimestamp), true, `${paneId} must not reveal future bars`);
  assert.equal(timestamps.every((timestamp, index) => index === 0 || timestamp > timestamps[index - 1]), true, `${paneId} buckets must be ordered and unique`);
}

assert.equal(appended.get('main').bars.length, expectedSourceBarCount);
assert.equal(result.appendedBarCount, [...appended.values()]
  .reduce((total, record) => total + record.bars.length, 0));

console.log('V6 replay navigation Step 407 timeframe matrix smoke passed.');
