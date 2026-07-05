import assert from 'node:assert/strict';
import { CHART_DATA_COMMANDS, CHART_DATA_EVENTS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const events = [];
const unsubscribeBarsChanged = subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload) => {
  events.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataRuntime());
await registry.start({ emitEvent });

assert.equal(hasCommand(CHART_DATA_COMMANDS.REPLACE_BARS), true);
assert.equal(listenerCount(CHART_DATA_EVENTS.BARS_CHANGED), 1);

const replaced = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
    { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
    { timestamp: 300, open: 3, high: 4, low: 2.5, close: 3.5 },
  ],
  cursorTimestamp: 200,
  paneId: 'pane-default',
});
assert.equal(replaced.revision, 1);
assert.deepEqual(replaced.bars.map((bar) => bar.timestamp), [100, 200]);
assert.equal(events.length, 1);
assert.equal(events[0].operation, 'replace');
assert.equal(events[0].record.paneId, 'pane-default');

const appended = await dispatchCommand(CHART_DATA_COMMANDS.APPEND_BARS, {
  bars: [
    { timestamp: 240, open: 2.4, high: 3, low: 2, close: 2.5 },
    { timestamp: 360, open: 3.6, high: 4, low: 3, close: 3.5 },
  ],
  cursorTimestamp: 240,
  paneId: 'pane-default',
});
assert.equal(appended.revision, 2);
assert.deepEqual(appended.bars.map((bar) => bar.timestamp), [100, 200, 240]);
assert.equal(events.length, 2);
assert.equal(events[1].operation, 'append');

const fetched = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, {
  paneId: 'pane-default',
});
assert.deepEqual(fetched, appended);
fetched.bars[0].close = 0;
assert.equal((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-default' })).bars[0].close, 1.5);

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [{ timestamp: 100, open: 10, high: 11, low: 9, close: 10.5 }],
  paneId: 'pane-review',
});
assert.deepEqual(await dispatchCommand(CHART_DATA_COMMANDS.GET_SUMMARY), {
  paneCount: 2,
  panes: [
    { barCount: 3, paneId: 'pane-default', revision: 2 },
    { barCount: 1, paneId: 'pane-review', revision: 1 },
  ],
});

const cleared = await dispatchCommand(CHART_DATA_COMMANDS.CLEAR_PANE, {
  paneId: 'pane-default',
});
assert.deepEqual(cleared, {
  bars: [],
  paneId: 'pane-default',
  revision: 0,
});
assert.equal(events.at(-1).operation, 'clear');

await registry.stop();
assert.equal(hasCommand(CHART_DATA_COMMANDS.REPLACE_BARS), false);
unsubscribeBarsChanged();
assert.equal(listenerCount(CHART_DATA_EVENTS.BARS_CHANGED), 0);

console.log('v6 chart data runtime smoke passed');
