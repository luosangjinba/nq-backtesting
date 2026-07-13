import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../src/chart-data-projection/chart-data-projection-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import {
  CHART_DATA_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createDisplayTimeframeRuntime } from '../src/display-timeframe/display-timeframe-runtime.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

const t = (iso) => Math.floor(Date.parse(iso) / 1000);

function sourceBar(iso, open) {
  return {
    close: open + 0.5,
    high: open + 1,
    low: open - 1,
    open,
    timestamp: t(iso),
  };
}

function targetBar(iso, open) {
  return {
    close: open + 0.5,
    high: open + 1,
    low: open - 1,
    open,
    timestamp: t(iso),
  };
}

async function startRuntime({ fetchTargetBars }) {
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
  return registry;
}

const sourceBars = [
  sourceBar('2026-06-01T17:58:00.000Z', 98),
  sourceBar('2026-06-01T17:59:00.000Z', 99),
  sourceBar('2026-06-01T18:00:00.000Z', 100),
  sourceBar('2026-06-01T18:01:00.000Z', 101),
  sourceBar('2026-06-01T18:02:00.000Z', 102),
  sourceBar('2026-06-01T18:03:00.000Z', 103),
  sourceBar('2026-06-01T18:04:00.000Z', 104),
  sourceBar('2026-06-01T18:05:00.000Z', 105),
];

const targetBars = [
  {
    ...targetBar('2026-06-01T18:00:00.000Z', 200),
    bucketEndTimestamp: t('2026-06-01T18:02:00.000Z'),
    bucketStartTimestamp: t('2026-06-01T18:00:00.000Z'),
  },
  targetBar('2026-06-01T18:05:00.000Z', 205),
];

const targetFetchCalls = [];
let registry = await startRuntime({
  fetchTargetBars: async (window) => {
    targetFetchCalls.push({ ...window });
    return {
      bars: targetBars,
      requestedRange: { startTs: t('2026-06-01T18:00:00.000Z'), endTs: t('2026-06-01T18:10:00.000Z') },
      timing: { source: 'step335-target-materialization' },
    };
  },
});
const unregisterReplay = registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({
  cursorTime: '2026-06-01T18:02:00.000Z',
}));

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: sourceBars,
  cursorTimestamp: t('2026-06-01T18:05:00.000Z'),
  paneId: 'main',
});

const materialized = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
  paneId: 'main',
  targetHistory: {
    enabled: true,
    end: '2026-06-01 18:10',
    start: '2026-06-01 18:00',
  },
});

assert.equal(targetFetchCalls.length, 1);
assert.equal(materialized.projectionSource.owner, 'runtime.bar-data');
assert.equal(materialized.targetHistory.status, 'applied');
assert.equal(materialized.targetHistory.reason, 'target-history-opt-in');
assert.equal(materialized.targetHistory.barCount, 1);
assert.deepEqual(materialized.targetHistory.revealStates.map((state) => state.reason), [
  'target-bar-complete-before-or-at-source-cursor',
  'target-bar-start-after-source-cursor',
]);
assert.deepEqual(materialized.chartRecord.bars.map((bar) => bar.timestamp), [
  t('2026-06-01T18:00:00.000Z'),
]);
assert.deepEqual(materialized.chartRecord.bars.map((bar) => bar.open), [200]);

const preservedSource = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
assert.deepEqual(preservedSource.bars.map((bar) => bar.timestamp), sourceBars.map((bar) => bar.timestamp));

unregisterReplay();
await registry.stop();

const fallbackFetchCalls = [];
registry = await startRuntime({
  fetchTargetBars: async (window) => {
    fallbackFetchCalls.push({ ...window });
    return { bars: targetBars };
  },
});

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: sourceBars,
  cursorTimestamp: t('2026-06-01T18:05:00.000Z'),
  paneId: 'main',
});

const fallback = await dispatchCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
  displayTimeframe: 5,
  paneId: 'main',
  targetHistory: {
    enabled: true,
    end: '2026-06-01 18:10',
    start: '2026-06-01 18:00',
  },
});

assert.equal(fallbackFetchCalls.length, 0);
assert.equal(fallback.projectionSource.owner, 'runtime.chart-data-projection');
assert.equal(fallback.targetHistory.status, 'fallback');
assert.equal(fallback.targetHistory.reason, 'source-replay-cursor-unavailable');
assert.deepEqual(fallback.chartRecord.bars.map((bar) => bar.timestamp), [
  t('2026-06-01T17:55:00.000Z'),
  t('2026-06-01T18:00:00.000Z'),
  t('2026-06-01T18:05:00.000Z'),
]);

await registry.stop();

console.log('v6 display timeframe target materialization runtime step335 smoke passed');
