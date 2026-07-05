import assert from 'node:assert/strict';

import { BAR_DATA_COMMANDS } from '../src/contracts/bar-data-contracts.js';
import { CHART_COMMANDS } from '../src/contracts/chart-contracts.js';
import { createReplayDisplayWindowController } from '../src/runtime/replay-display-window-controller.js';

const cursorTimestamp = '2026-06-01T09:31:00.000Z';
const coveredHourBar = {
  timestamp: Date.parse('2026-06-01T09:00:00.000Z') / 1000,
  time: '2026-06-01T09:00:00.000Z',
  open: 30000,
  high: 30020,
  low: 29980,
  close: 30010,
};

let state = {
  sessionId: 'session-fast-path',
  status: 'replay-ready',
  replayTimeframe: 1,
  displayTimeframe: 1,
  cursorTimestamp,
  displayBars: [],
  viewportMetrics: {},
  session: {
    instrument: 'NQ',
    timeframe: 1,
  },
};

const calls = [];
const chartSyncCalls = [];
const controller = createReplayDisplayWindowController({
  getState: () => state,
  setState: (nextState) => {
    state = nextState;
    return state;
  },
  ensureInitialSession: async () => state,
  emitEvent: () => {},
  chartSync: {
    syncChartRightEdgeLimit: async (timestamp, options = {}) => {
      chartSyncCalls.push({ method: 'syncChartRightEdgeLimit', timestamp, options });
      return { ok: true };
    },
    syncChartViewportFollow: async (timestamp, options = {}) => {
      chartSyncCalls.push({ method: 'syncChartViewportFollow', timestamp, options });
      return { ok: true };
    },
    renderDisplayBars: async (bars, timestamp, options = {}) => {
      chartSyncCalls.push({ method: 'renderDisplayBars', bars, timestamp, options });
      return { ok: true };
    },
    syncChartDisplayContext: async (payload = {}) => {
      chartSyncCalls.push({ method: 'syncChartDisplayContext', payload });
      return { ok: true };
    },
    beginPaneDisplayLoad: async () => ({ displayContext: { displayRevision: 1 } }),
  },
  dispatchCommand: async (command, payload = {}) => {
    calls.push({ command, payload });
    if (command === CHART_COMMANDS.GET_VIEWPORT_METRICS) {
      return { estimatedVisibleBars: 120 };
    }
    if (command === CHART_COMMANDS.GET_RENDERED_BARS) {
      return {
        bars: [coveredHourBar],
        displayContext: {
          displayTimeframe: 60,
          displayRevision: 1,
        },
      };
    }
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      return {
        key: 'unexpected-load',
        instrument: 'NQ',
        timeframe: payload.timeframe,
        start: '2026-06-01 09:00',
        end: '2026-06-01 09:00',
        anchor: payload.anchor,
        direction: payload.direction,
        estimatedBars: 1,
        cached: false,
        bars: [coveredHourBar],
      };
    }
    return { ok: true };
  },
});

const result = await controller.projectDisplayForCursor({
  sessionId: 'session-fast-path',
  paneId: 'secondary',
  displayTimeframe: 60,
  cursorTimestamp,
});

assert.equal(result.loaded, false);
assert.equal(result.reason, 'cursor-covered-by-display-window');
assert.equal(result.paneId, 'secondary');
assert.equal(
  calls.filter((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW).length,
  0,
  'covered different-timeframe projection should not load another display window'
);
assert.deepEqual(
  chartSyncCalls.map((call) => call.method),
  ['syncChartRightEdgeLimit', 'syncChartViewportFollow']
);
assert.equal(chartSyncCalls[1].timestamp, cursorTimestamp);
assert.equal(chartSyncCalls[1].options.paneId, 'secondary');

console.log('v5 replay different-tf projection fast path smoke passed');
