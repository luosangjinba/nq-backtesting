import assert from 'node:assert/strict';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

const start = Date.parse('2026-06-01T09:30:00.000Z') / 1000;

function makeBar(offset, price) {
  return {
    close: price + 0.5,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp: start + (offset * 60),
  };
}

clearCommandsForTest();
clearEventsForTest();

const calls = [];
const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent });

let cursorIndex = 0;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({
  cursorIndex,
  cursorTime: '2026-06-01T09:30:00.000Z',
  endTime: '2026-06-01T10:00:00.000Z',
  revealedCount: 1,
  sessionId: 'manual-next-htf',
  startTime: '2026-06-01T09:30:00.000Z',
  status: 'ready',
  symbol: 'NQ',
  timeframe: '1m',
  totalBars: 31,
}));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  return {
    cursorIndex,
    cursorTime: '2026-06-01T09:31:00.000Z',
    endTime: '2026-06-01T10:00:00.000Z',
    revealedCount: 2,
    sessionId: 'manual-next-htf',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 31,
  };
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  active: true,
  displayTimeframe: 5,
  id: paneId,
  instrument: 'NQ',
}));
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
  calls.push({ command: BAR_DATA_COMMANDS.LOAD_WINDOW, payload });
  return {
    bars: [
      makeBar(-3, 97),
      makeBar(-2, 98),
      makeBar(-1, 99),
      makeBar(0, 100),
      makeBar(1, 101),
    ],
    cacheHit: false,
    key: 'NQ|1|2026-06-01T09:31:00.000Z',
    timeframe: 1,
  };
});

const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-htf' });
const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-htf' });
const projectionState = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.GET_STATE);

assert.equal(state.status, 'advanced', state.error || 'manual next HTF should advance');
assert.deepEqual(calls[0].payload, {
  anchor: '2026-06-01T09:31:00.000Z',
  count: 5,
  direction: 'backward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(state.advanced.appendedBarCount, 1);
assert.equal(state.advanced.loadedWindow.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(state.advanced.loadedWindow.projectionSource.sourceTimeframe, 1);
assert.equal(state.advanced.loadedWindow.projectionSource.targetTimeframe, 5);
assert.equal(projectionState.projectionRevision, 1);
assert.equal(projectionState.lastProjection.paneId, 'pane-htf');
assert.deepEqual(chartRecord.bars.map((bar) => ({
  close: bar.close,
  high: bar.high,
  low: bar.low,
  open: bar.open,
  timestamp: bar.timestamp,
})), [
  {
    close: 101.5,
    high: 102,
    low: 99,
    open: 100,
    timestamp: start,
  },
]);

await registry.stop();

console.log('v6 manual next HTF projection step 197 smoke passed');
