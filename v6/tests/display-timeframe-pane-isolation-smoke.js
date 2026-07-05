import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createDisplayTimeframeRuntime } from '../src/display-timeframe/display-timeframe-runtime.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneStore } from '../src/panes/pane-store.js';
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
    createPaneRecord({ active: false, displayTimeframe: 1, id: 'pane-right' }),
  ],
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createDisplayTimeframeRuntime());
await registry.start({ emitEvent, subscribeEvent });

const leftBars = Array.from({ length: 10 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));
const rightBars = Array.from({ length: 10 }, (_, index) => ({
  close: 200 + index + 0.5,
  high: 201 + index,
  low: 199 + index,
  open: 200 + index,
  timestamp: 1780306200 + (index * 60),
}));
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: leftBars,
  cursorTimestamp: leftBars.at(-1).timestamp,
  paneId: 'pane-left',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: rightBars,
  cursorTimestamp: rightBars.at(-1).timestamp,
  paneId: 'pane-right',
});

await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
});
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-left')).displayTimeframe, 5);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-right')).displayTimeframe, 1);
assert.deepEqual(
  (await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-left' })).bars.map((bar) => bar.timestamp),
  [1780306200, 1780306500],
);
assert.deepEqual(
  (await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-right' })).bars.map((bar) => bar.close),
  rightBars.map((bar) => bar.close),
);

await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, 'pane-right');
await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
});
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-left')).displayTimeframe, 5);
assert.equal((await dispatchCommand(PANE_COMMANDS.GET_BY_ID, 'pane-right')).displayTimeframe, 5);
assert.deepEqual(
  (await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-left' })).bars.map((bar) => bar.close),
  [104.5, 109.5],
);
assert.deepEqual(
  (await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-right' })).bars.map((bar) => bar.close),
  [204.5, 209.5],
);

await registry.stop();

console.log('v6 display timeframe pane isolation smoke passed');
