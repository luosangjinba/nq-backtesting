import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { appendReplayCursorAcrossPanes } from '../src/replay/replay-cursor-pane-materializer.js';

const cursorTimestamp = Date.parse('2025-01-06T16:00:00.000Z') / 1000;
const sourceBars = [
  { close: 100, timestamp: cursorTimestamp - 60 },
  { close: 101, timestamp: cursorTimestamp },
];
const calls = [];
const panes = {
  main: { displayTimeframe: 1, id: 'main', instrument: 'nq' },
  secondary: { displayTimeframe: 240, id: 'secondary', instrument: 'es' },
};

const result = await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    calls.push({ command, payload });
    if (command === PANE_COMMANDS.GET_BY_ID) return panes[payload];
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      return {
        bars: sourceBars,
        cacheHit: payload.instrument === 'NQ',
        key: `${payload.instrument}:${payload.timeframe}`,
      };
    }
    if (command === CHART_DATA_PROJECTION_COMMANDS.PROJECT) {
      return {
        bars: [{ close: 101, timestamp: cursorTimestamp - 3600 }],
        buckets: [{
          bucketEndTimestamp: cursorTimestamp,
          bucketStartTimestamp: cursorTimestamp - 3600,
        }],
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
  hasCommand: (command) => command === CHART_DATA_PROJECTION_COMMANDS.PROJECT,
  paneIds: ['main', 'secondary'],
  replayState: {
    cursorTime: '2025-01-06T16:00:00.000Z',
    startTime: '2025-01-01T14:30:00.000Z',
    symbol: 'nq',
    timeframe: 1,
  },
});

assert.equal(result.appendedBarCount, 2);
assert.deepEqual(result.chartRecords.map((record) => record.paneId), ['main', 'secondary']);
assert.deepEqual(result.loadedWindows.map((record) => record.paneId), ['main', 'secondary']);
assert.equal(result.loadedWindows[0].cacheHit, true);
assert.notEqual(result.loadedWindows[1].projectionSource, null);

const loadCalls = calls.filter((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW);
assert.deepEqual(loadCalls.map((call) => call.payload.count), [2, 240]);
assert.deepEqual(loadCalls.map((call) => call.payload.instrument), ['NQ', 'ES']);
assert.equal(calls.filter((call) => call.command === CHART_DATA_PROJECTION_COMMANDS.PROJECT).length, 1);

const appendCalls = calls.filter((call) => call.command === CHART_DATA_COMMANDS.APPEND_BARS);
assert.equal(appendCalls.length, 2);
assert.deepEqual(appendCalls[0].payload.bars, [sourceBars[1]]);
assert.deepEqual(appendCalls[1].payload.sourceBars, [sourceBars[1]]);

console.log('V6 replay cursor pane materializer Step 404 smoke passed.');
