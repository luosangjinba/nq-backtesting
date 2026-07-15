import assert from 'node:assert/strict';
import { createBarWindowCache } from '../src/bar-data/bar-window-cache.js';
import { appendReplayCursorAcrossPanes } from '../src/replay/replay-cursor-pane-materializer.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';

const cursorTime = '2026-05-06T13:31:00.000Z';
const cursorTimestamp = Date.parse(cursorTime) / 1000;
const cache = createBarWindowCache();
cache.put({
  anchor: cursorTime,
  count: 240,
  direction: 'forward',
  instrument: 'NQ',
  timeframe: 1,
}, {
  bars: [{ close: 101, high: 102, low: 100, open: 100, timestamp: cursorTimestamp }],
});

const loads = [];
const result = await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return { displayTimeframe: 1, id: 'main', instrument: 'NQ', timeframe: 1 };
    }
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      loads.push(payload);
      const record = cache.get(payload);
      assert.notEqual(record, null, 'same-timeframe cursor window must hit the forward cache');
      return record;
    }
    if (command === CHART_DATA_COMMANDS.APPEND_BARS) {
      return { bars: payload.bars, paneId: payload.paneId };
    }
    throw new Error(`Unexpected command: ${command}`);
  },
  hasCommand: () => false,
  paneIds: ['main'],
  replayState: {
    cursorTime,
    startTime: '2026-05-06T13:30:00.000Z',
    symbol: 'NQ',
    timeframe: 1,
  },
});

assert.equal(loads.length, 1);
assert.equal(loads[0].count, 1);
assert.equal(result.loadedWindows[0].cacheHit, true);
assert.equal(result.appendedBarCount, 1);

const fallbackLoads = [];
await appendReplayCursorAcrossPanes({
  dispatchCommand: async (command, payload) => {
    if (command === PANE_COMMANDS.GET_BY_ID) throw new Error('pane unavailable');
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      fallbackLoads.push(payload);
      return {
        bars: [{ close: 101, timestamp: cursorTimestamp }],
        cacheHit: true,
      };
    }
    if (command === CHART_DATA_COMMANDS.APPEND_BARS) return { bars: payload.bars };
    throw new Error(`Unexpected command: ${command}`);
  },
  hasCommand: () => false,
  paneIds: ['main'],
  replayState: {
    cursorTime,
    startTime: '2026-05-06T13:30:00.000Z',
    symbol: 'NQ',
    timeframe: '1m',
  },
});
assert.equal(fallbackLoads[0].count, 1, '1m fallback must not be interpreted as 1M');

console.log('v6 replay cursor exact window step462 smoke passed');
