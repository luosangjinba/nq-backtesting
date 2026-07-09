import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createDefaultWallRuntime } from '../src/default-wall/default-wall-runtime.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneStore } from '../src/panes/pane-store.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const paneStore = createPaneStore({
  initialPanes: [
    createPaneRecord({ active: true, displayTimeframe: 1, id: 'pane-left' }),
    createPaneRecord({ active: false, displayTimeframe: 5, id: 'pane-right' }),
  ],
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createDefaultWallRuntime());
await registry.start({ emitEvent, subscribeEvent });

const bars = Array.from({ length: 16 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));

await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'pane-left');
const changedActivePane = await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
  displayTimeframe: 15,
});
const inactivePane = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-right');
assert.equal(changedActivePane.id, 'pane-left');
assert.equal(changedActivePane.displayTimeframe, 15);
assert.equal(inactivePane.displayTimeframe, 5);

const loaded = await dispatchCommand(DEFAULT_WALL_COMMANDS.LOAD, {
  bars,
  latestOffsetBars: 4,
  paneDisplayTimeframes: {
    'pane-right': '5',
  },
  paneIds: ['pane-left', 'pane-right'],
  prefixBars: 0,
  session: {
    endTime: '2026-06-01T09:45:00.000Z',
    id: 'mixed-timeframe-session',
    startTime: '2026-06-01T09:30:00.000Z',
    symbol: 'NQ',
    timeframe: '1m',
  },
  spanBars: 120,
});
assert.deepEqual(loaded.displayTimeframes, {
  'pane-left': 15,
  'pane-right': 5,
});

for (let index = 0; index < 15; index += 1) {
  await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
}

const leftRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-left' });
const rightRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-right' });
assert.deepEqual(leftRecord.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780307100,
]);
assert.deepEqual(rightRecord.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306500,
  1780306800,
  1780307100,
]);
assert.equal(leftRecord.bars.at(-1).close, 115.5);
assert.equal(rightRecord.bars.at(-1).close, 115.5);

await registry.stop();

console.log('v6 default wall mixed timeframe runtime smoke passed');
