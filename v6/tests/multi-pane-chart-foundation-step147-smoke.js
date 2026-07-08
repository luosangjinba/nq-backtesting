import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { connectChartDataSurfaceBridge } from '../src/chart-engine/chart-data-surface-bridge.js';
import { connectChartViewportSurfaceBridge } from '../src/chart-engine/chart-viewport-surface-bridge.js';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
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

function createHost(paneId) {
  return {
    clientHeight: 280,
    clientWidth: 520,
    dataset: { v6PaneId: paneId },
    getBoundingClientRect() {
      return { height: 280, width: 520 };
    },
    isConnected: true,
  };
}

function createManagerFactory(calls) {
  return () => {
    const records = new Map();
    return {
      destroyAll() {
        calls.push({ method: 'destroyAll' });
        records.clear();
      },
      mountPane({ paneId }) {
        calls.push({ method: 'mountPane', paneId });
        records.set(paneId, {
          dataLength: 0,
          mounted: true,
          visibleLogicalRange: null,
        });
      },
      resizePane(paneId) {
        return {
          paneId,
          snapshot: { ...records.get(paneId) },
        };
      },
      setData(paneId, bars = []) {
        calls.push({ length: bars.length, method: 'setData', paneId });
        records.set(paneId, {
          ...records.get(paneId),
          dataLength: bars.length,
        });
        return {
          paneId,
          snapshot: { ...records.get(paneId) },
        };
      },
      setVisibleLogicalRange(paneId, range) {
        calls.push({ method: 'setVisibleLogicalRange', paneId, range: { ...range } });
        records.set(paneId, {
          ...records.get(paneId),
          visibleLogicalRange: { from: Number(range.from), to: Number(range.to) },
        });
        return {
          paneId,
          snapshot: { ...records.get(paneId) },
        };
      },
      snapshot() {
        return {
          panes: [...records.entries()]
            .map(([paneId, snapshot]) => ({
              paneId,
              snapshot: { ...snapshot },
            }))
            .sort((left, right) => left.paneId.localeCompare(right.paneId)),
        };
      },
      subscribeVisibleLogicalRangeChange() {
        return () => {};
      },
    };
  };
}

clearCommandsForTest();
clearEventsForTest();

const calls = [];
const root = {
  querySelectorAll() {
    return [createHost('pane-left'), createHost('pane-right')];
  },
};
const chartSurface = mountWorkstationChartSurface(root, {
  managerFactory: createManagerFactory(calls),
});
const chartDataBridge = connectChartDataSurfaceBridge({
  chartSurface,
  subscribeEvent,
});
const chartViewportBridge = connectChartViewportSurfaceBridge({
  chartSurface,
  subscribeEvent,
});

const paneStore = createPaneStore({
  initialPanes: [
    createPaneRecord({ active: true, displayTimeframe: 1, id: 'pane-left', instrument: 'NQ' }),
    createPaneRecord({ active: false, displayTimeframe: 1, id: 'pane-right', instrument: 'NQ' }),
  ],
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.deepEqual((await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT)).panes.map((pane) => pane.id), [
  'pane-left',
  'pane-right',
]);

for (const paneId of ['pane-left', 'pane-right']) {
  await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
    cursorTimestamp: 1780306200,
    latestOffsetBars: 8,
    paneId,
    spanBars: 40,
  });
}

await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
    { close: 101.5, high: 102, low: 100, open: 101, timestamp: 1780306260 },
  ],
  cursorTimestamp: 1780306260,
  paneId: 'pane-left',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 200.5, high: 201, low: 199, open: 200, timestamp: 1780306200 },
    { close: 201.5, high: 202, low: 200, open: 201, timestamp: 1780306260 },
    { close: 202.5, high: 203, low: 201, open: 202, timestamp: 1780306320 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'pane-right',
});

await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 4,
  paneId: 'pane-right',
  spanBars: 24,
});
const rightRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-right' });
await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
  chartBarsRevision: rightRecord.revision,
  latestLogicalIndex: rightRecord.bars.length - 1,
  paneId: 'pane-right',
});

const surfaceState = chartSurface.getState();
assert.deepEqual(surfaceState.appliedChartData, [
  { barCount: 2, paneId: 'pane-left', revision: 1 },
  { barCount: 3, paneId: 'pane-right', revision: 1 },
]);
assert.deepEqual(
  surfaceState.appliedViewport.map((viewport) => ({
    from: viewport.from,
    origin: viewport.origin,
    paneId: viewport.paneId,
    to: viewport.to,
  })),
  [
    { from: -31, origin: 'default', paneId: 'pane-left', to: 9 },
    { from: -18, origin: 'manual', paneId: 'pane-right', to: 6 },
  ],
);
assert.deepEqual(
  surfaceState.panes.map((pane) => ({
    dataLength: pane.snapshot.dataLength,
    paneId: pane.paneId,
    visibleLogicalRange: pane.snapshot.visibleLogicalRange,
  })),
  [
    { dataLength: 2, paneId: 'pane-left', visibleLogicalRange: { from: -31, to: 9 } },
    { dataLength: 3, paneId: 'pane-right', visibleLogicalRange: { from: -18, to: 6 } },
  ],
);
assert.deepEqual(
  calls.filter((call) => call.method === 'setData').map((call) => [call.paneId, call.length]),
  [['pane-left', 2], ['pane-right', 3]],
);
assert.deepEqual(
  calls.filter((call) => call.method === 'setVisibleLogicalRange').map((call) => [call.paneId, call.range]),
  [
    ['pane-left', { from: -31, to: 9 }],
    ['pane-right', { from: -30, to: 10 }],
    ['pane-right', { from: -18, to: 6 }],
  ],
);

await registry.stop();
chartDataBridge.destroy();
chartViewportBridge.destroy();
chartSurface.destroy();

console.log('v6 multi-pane chart foundation step 147 smoke passed');
