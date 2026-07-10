import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createDisplayTimeframeRuntime } from '../src/display-timeframe/display-timeframe-runtime.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const appliedEvents = [];
const unsubscribeApplied = subscribeEvent(DISPLAY_TIMEFRAME_EVENTS.APPLIED, (payload) => {
  appliedEvents.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createDisplayTimeframeRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'main',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: Array.from({ length: 6 }, (_, index) => ({
    close: 100 + index + 0.5,
    high: 101 + index,
    low: 99 + index,
    open: 100 + index,
    ...(index === 5
      ? { time: '2026-06-01 09:35:00' }
      : { timestamp: 1780306200 + (index * 60) }),
  })),
  cursorTimestamp: 1780306500,
  paneId: 'main',
});

const beforeViewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
  paneId: 'main',
});
assert.equal(beforeViewport.intent.origin, 'default');
assert.equal(beforeViewport.intent.revision, 0);

assert.equal(hasCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY), true);
const applied = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
  paneId: 'main',
});

assert.equal(applied.pane.displayTimeframe, 5);
assert.equal(applied.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(applied.projectionSource.sourceTimeframe, 1);
assert.equal(applied.projectionSource.targetTimeframe, 5);
assert.equal(applied.sourceBarCount, 6);
assert.equal(applied.targetBarCount, 2);
assert.deepEqual(applied.chartRecord.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306500,
]);
assert.equal(applied.viewportRecord.intent.origin, 'default');
assert.equal(applied.viewportRecord.intent.revision, 0);
assert.equal(applied.viewportRecord.projection.latestLogicalIndex, 1);
assert.equal(appliedEvents.length, 1);

const pane = await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
assert.equal(pane.displayTimeframe, 5);

const restored = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 1,
  paneId: 'main',
});
assert.equal(restored.pane.displayTimeframe, 1);
assert.equal(restored.projectionSource.sourceTimeframe, 1);
assert.equal(restored.projectionSource.targetTimeframe, 1);
assert.equal(restored.sourceBarCount, 6);
assert.equal(restored.targetBarCount, 6);
assert.deepEqual(restored.chartRecord.bars.map((bar) => bar.timestamp), [
  1780306200,
  1780306260,
  1780306320,
  1780306380,
  1780306440,
  1780306500,
]);
assert.equal(appliedEvents.length, 2);

await registry.stop();
assert.equal(hasCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY), false);
unsubscribeApplied();

console.log('v6 display timeframe runtime smoke passed');
