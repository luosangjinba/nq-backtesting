import assert from 'node:assert/strict';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryManualPreviousRuntime } from '../src/chart-entry/chart-entry-manual-previous-runtime.js';
import {
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS,
  CHART_ENTRY_MANUAL_PREVIOUS_EVENTS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
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

const rewoundEvents = [];
const unsubscribeRewound = subscribeEvent(
  CHART_ENTRY_MANUAL_PREVIOUS_EVENTS.REWOUND,
  (payload) => rewoundEvents.push(payload),
);
const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartEntryManualPreviousRuntime());
await registry.start({ emitEvent });

let cursorIndex = 3;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({
  cursorIndex,
  cursorTime: `2026-06-01T09:3${cursorIndex}:00.000Z`,
  endTime: '2026-06-01T09:40:00.000Z',
  revealedCount: cursorIndex + 1,
  sessionId: 'manual-previous',
  startTime: '2026-06-01T09:30:00.000Z',
  status: 'ready',
  symbol: 'NQ',
  timeframe: '1m',
  totalBars: 11,
}));
registerCommand(REPLAY_COMMANDS.PREVIOUS, () => {
  cursorIndex = Math.max(0, cursorIndex - 1);
  return {
    cursorIndex,
    cursorTime: `2026-06-01T09:3${cursorIndex}:00.000Z`,
    endTime: '2026-06-01T09:40:00.000Z',
    revealedCount: cursorIndex + 1,
    sessionId: 'manual-previous',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 11,
  };
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  active: true,
  displayTimeframe: 1,
  id: paneId,
  instrument: 'NQ',
}));

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    makeBar(0, 100),
    makeBar(1, 101),
    makeBar(2, 102),
    makeBar(3, 103),
  ],
  cursorTimestamp: start + 180,
  paneId: 'main',
});

assert.equal(hasCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS), true);

const state = await dispatchCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS, { paneId: 'main' });
const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });

assert.equal(state.status, 'rewound', state.error || 'manual previous should rewind');
assert.equal(state.rewound.replayState.cursorIndex, 2);
assert.equal(state.rewound.replacedBarCount, 3);
assert.equal(state.rewound.loadedWindow.source, 'chart-data-filter');
assert.equal(rewoundEvents.length, 1);
assert.deepEqual(chartRecord.bars.map((bar) => bar.timestamp), [
  start,
  start + 60,
  start + 120,
]);

await registry.stop();
unsubscribeRewound();
assert.equal(hasCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.GET_STATE), false);
assert.equal(hasCommand(CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS), false);

console.log('v6 chart-entry manual previous runtime step 238 smoke passed');
