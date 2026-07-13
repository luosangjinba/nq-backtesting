import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { appendReplayCursorAcrossPanes } from '../src/replay/replay-cursor-pane-materializer.js';

const timestamp = (minute) => Date.parse(`2026-05-01T10:${String(minute).padStart(2, '0')}:00.000Z`) / 1000;
const sourceBars = [1, 2, 3, 4, 5].map((minute) => ({
  close: 100 + minute,
  high: 101 + minute,
  low: 99 + minute,
  open: 100 + minute,
  timestamp: timestamp(minute),
}));
const calls = [];

const result = await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    calls.push({ command, payload });
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return { displayTimeframe: 1, id: payload, instrument: 'nq' };
    }
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      return { bars: sourceBars, cacheHit: false, key: 'range-window' };
    }
    if (command === CHART_DATA_COMMANDS.APPEND_BARS) {
      return { bars: payload.bars, paneId: payload.paneId };
    }
    throw new Error(`Unexpected command: ${command}`);
  },
  fromCursorTime: '2026-05-01T10:00:00.000Z',
  hasCommand: (command) => command === CHART_DATA_PROJECTION_COMMANDS.PROJECT,
  paneIds: ['main'],
  replayState: {
    cursorTime: '2026-05-01T10:05:00.000Z',
    startTime: '2026-05-01T09:30:00.000Z',
    symbol: 'NQ',
    timeframe: 1,
  },
});

const load = calls.find((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW);
assert.deepEqual(load.payload, {
  anchor: '2026-05-01T10:01:00.000Z',
  count: 5,
  direction: 'forward',
  instrument: 'NQ',
  timeframe: 1,
});
const append = calls.find((call) => call.command === CHART_DATA_COMMANDS.APPEND_BARS);
assert.deepEqual(append.payload.bars, sourceBars);
assert.deepEqual(append.payload.sourceBars, sourceBars);
assert.equal(result.appendedBarCount, 5);
assert.equal(result.loadedWindows[0].barCount, 5);
assert.equal(result.loadedWindows[0].windowCount, 1);

const projectionCalls = [];
const projectedBars = [
  { close: 103, high: 104, low: 99, open: 100, timestamp: timestamp(0) },
  { close: 105, high: 106, low: 102, open: 103, timestamp: timestamp(4) },
];
const projected = await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    projectionCalls.push({ command, payload });
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return { displayTimeframe: 240, id: payload, instrument: 'nq' };
    }
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) return { bars: sourceBars };
    if (command === CHART_DATA_PROJECTION_COMMANDS.PROJECT) {
      assert.deepEqual(payload.bars, sourceBars);
      return {
        bars: projectedBars,
        buckets: [],
        sourceBarCount: sourceBars.length,
        sourceTimeframe: 1,
        targetTimeframe: 240,
      };
    }
    if (command === CHART_DATA_COMMANDS.APPEND_BARS) {
      return { bars: payload.bars, paneId: payload.paneId };
    }
    throw new Error(`Unexpected command: ${command}`);
  },
  fromCursorTime: '2026-05-01T10:00:00.000Z',
  hasCommand: (command) => command === CHART_DATA_PROJECTION_COMMANDS.PROJECT,
  paneIds: ['secondary'],
  replayState: {
    cursorTime: '2026-05-01T10:05:00.000Z',
    startTime: '2026-05-01T09:30:00.000Z',
    symbol: 'NQ',
    timeframe: 1,
  },
});
assert.equal(projected.appendedBarCount, 2);
assert.deepEqual(
  projectionCalls.find((call) => call.command === CHART_DATA_COMMANDS.APPEND_BARS).payload.bars,
  projectedBars,
);

await assert.rejects(
  () => appendReplayCursorAcrossPanes({
    dispatchCommand: async (command, payload) => {
      if (command === PANE_COMMANDS.GET_BY_ID) return { displayTimeframe: 1, id: payload };
      throw new Error(`Unexpected command: ${command}`);
    },
    fromCursorTime: '2026-05-01T10:05:00.000Z',
    paneIds: ['main'],
    replayState: {
      cursorTime: '2026-05-01T10:05:00.000Z',
      startTime: '2026-05-01T09:30:00.000Z',
      symbol: 'NQ',
      timeframe: 1,
    },
  }),
  /range must advance forward/,
);

console.log('V6 replay cursor range materializer Step 407 smoke passed.');
