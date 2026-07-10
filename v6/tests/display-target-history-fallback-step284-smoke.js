import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import {
  CHART_DATA_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createDisplayTimeframeRuntime } from '../src/display-timeframe/display-timeframe-runtime.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
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

async function createHarness({ fetchTargetBars }) {
  clearCommandsForTest();
  clearEventsForTest();

  const registry = createRuntimeRegistry();
  registry.registerRuntime(createPaneRuntime());
  registry.registerRuntime(createChartDataRuntime());
  registry.registerRuntime(createChartDataProjectionRuntime());
  registry.registerRuntime(createChartViewportRuntime());
  registry.registerRuntime(createBarDataRuntime({ fetchTargetBars }));
  registry.registerRuntime(createDisplayTimeframeRuntime());
  await registry.start({ emitEvent, subscribeEvent });

  const sourceBars = Array.from({ length: 6 }, (_, index) => ({
    close: 100 + index + 0.5,
    high: 101 + index,
    low: 99 + index,
    open: 100 + index,
    timestamp: 1780272000 + (index * 60),
  }));
  await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
    bars: sourceBars,
    cursorTimestamp: 1780272300,
    paneId: 'main',
  });

  return { registry, sourceBars };
}

const disabledFetchCalls = [];
const disabledHarness = await createHarness({
  fetchTargetBars: async (window) => {
    disabledFetchCalls.push({ ...window });
    throw new Error('target fetch should not run when disabled');
  },
});

const defaultApplied = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
  paneId: 'main',
});
assert.equal(disabledFetchCalls.length, 0);
assert.equal(defaultApplied.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(defaultApplied.targetHistory.status, 'disabled');
assert.equal(defaultApplied.targetHistory.reason, 'target-history-disabled');
assert.equal(defaultApplied.sourceBarCount, 6);
assert.equal(defaultApplied.targetBarCount, 2);

await disabledHarness.registry.stop();

const failingFetchCalls = [];
const failingHarness = await createHarness({
  fetchTargetBars: async (window) => {
    failingFetchCalls.push({ ...window });
    throw new Error('planned target fetch failure');
  },
});

const fallbackApplied = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
  paneId: 'main',
  targetHistory: {
    enabled: true,
    end: '2026-06-01 00:05',
    start: '2026-06-01 00:00',
  },
});
assert.equal(failingFetchCalls.length, 3);
assert.equal(fallbackApplied.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(fallbackApplied.targetHistory.status, 'fallback');
assert.equal(fallbackApplied.targetHistory.reason, 'target-history-load-failed');
assert.equal(fallbackApplied.targetHistory.errorMessage, 'planned target fetch failure');
assert.equal(fallbackApplied.sourceBarCount, 6);
assert.equal(fallbackApplied.targetBarCount, 2);

const sourceAfterFallback = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, {
  paneId: 'main',
});
assert.deepEqual(
  sourceAfterFallback.bars.map((bar) => bar.timestamp),
  failingHarness.sourceBars.map((bar) => bar.timestamp),
);

await failingHarness.registry.stop();

console.log('v6 display target history fallback step284 smoke passed');
