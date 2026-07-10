import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import {
  CHART_DATA_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
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
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const targetFetchCalls = [];
const sourceBars = Array.from({ length: 6 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: index === 5 ? 1780300800 : 1780272000 + (index * 60),
}));

const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartDataProjectionRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createBarDataRuntime({
  fetchTargetBars: async (window) => {
    targetFetchCalls.push({ ...window });
    return {
      bars: [
        { timestamp: 1780272000, open: 200, high: 230, low: 190, close: 220 },
        { timestamp: 1780300800, open: 220, high: 240, low: 210, close: 215 },
      ],
      requestedRange: { startTs: 1780272000, endTs: 1780300800 },
      timing: { source: 'target-fetch' },
    };
  },
}));
registry.registerRuntime(createDisplayTimeframeRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: sourceBars,
  cursorTimestamp: 1780300800,
  paneId: 'main',
});

const appliedTarget = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 480,
  paneId: 'main',
  targetHistory: {
    enabled: true,
    end: '2026-06-01 08:00',
    start: '2026-06-01 00:00',
  },
});

assert.equal(targetFetchCalls.length, 1);
assert.deepEqual(targetFetchCalls[0], {
  bounded: true,
  bucketType: 'fixed-duration',
  dataKind: 'target-display',
  end: '2026-06-01 08:00',
  estimatedBars: 2,
  instrument: 'NQ',
  start: '2026-06-01 00:00',
  timeframe: '8h',
});
assert.equal(appliedTarget.pane.displayTimeframe, 480);
assert.equal(appliedTarget.projectionSource.owner, 'runtime.bar-data');
assert.equal(appliedTarget.projectionSource.sourceTimeframe, 1);
assert.equal(appliedTarget.projectionSource.targetTimeframe, '8h');
assert.equal(appliedTarget.sourceBarCount, 6);
assert.equal(appliedTarget.targetBarCount, 2);
assert.equal(appliedTarget.targetHistory.status, 'applied');
assert.equal(appliedTarget.targetHistory.reason, 'target-history-opt-in');
assert.deepEqual(appliedTarget.chartRecord.bars.map((bar) => bar.open), [200, 220]);

const sourceRecordAfterTarget = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, {
  paneId: 'main',
});
assert.deepEqual(sourceRecordAfterTarget.bars.map((bar) => bar.timestamp), sourceBars.map((bar) => bar.timestamp));

const restored = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 1,
  paneId: 'main',
});
assert.equal(restored.pane.displayTimeframe, 1);
assert.equal(restored.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(restored.sourceBarCount, 6);
assert.equal(restored.targetBarCount, 6);
assert.equal(restored.targetHistory.status, 'disabled');
assert.deepEqual(restored.chartRecord.bars.map((bar) => bar.timestamp), sourceBars.map((bar) => bar.timestamp));

const pane = await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
assert.equal(pane.displayTimeframe, 1);

await registry.stop();

console.log('v6 display target history opt-in step284 smoke passed');
