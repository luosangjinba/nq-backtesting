import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
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

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'pane-manual',
});

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
    { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
    { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'pane-manual',
});

const manual = await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 3,
  paneId: 'pane-manual',
  spanBars: 24,
});
assert.equal(manual.intent.origin, 'manual');
assert.equal(manual.intent.revision, 1);

const displayReplace = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { timestamp: 1780306080, open: 98, high: 99, low: 97, close: 98.5 },
    { timestamp: 1780306140, open: 99, high: 100, low: 98, close: 99.5 },
    { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
    { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
    { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'pane-manual',
});
assert.equal(displayReplace.bars.length, 5);

let viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-manual' });
assert.equal(viewport.intent.origin, 'manual');
assert.equal(viewport.intent.revision, 1);
assert.equal(viewport.intent.latestOffsetBars, 3);
assert.equal(viewport.intent.spanBars, 24);
assert.deepEqual(viewport.projection, {
  from: -17,
  latestLogicalIndex: 4,
  latestOffsetBars: 3,
  origin: 'manual',
  revision: 1,
  spanBars: 24,
  to: 7,
});

await dispatchCommand(CHART_DATA_COMMANDS.APPEND_BARS, {
  bars: [
    { timestamp: 1780306380, open: 102.5, high: 104, low: 102, close: 103.5 },
  ],
  cursorTimestamp: 1780306380,
  paneId: 'pane-manual',
});

viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-manual' });
assert.equal(viewport.intent.origin, 'manual');
assert.equal(viewport.intent.revision, 1);
assert.equal(viewport.intent.latestOffsetBars, 3);
assert.equal(viewport.intent.spanBars, 24);
assert.deepEqual(viewport.projection, {
  from: -16,
  latestLogicalIndex: 5,
  latestOffsetBars: 3,
  origin: 'manual',
  revision: 1,
  spanBars: 24,
  to: 8,
});

await registry.stop();

console.log('v6 manual wall display-window smoke passed');
