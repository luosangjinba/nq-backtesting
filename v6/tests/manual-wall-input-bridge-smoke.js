import assert from 'node:assert/strict';
import { CHART_VIEWPORT_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectManualWallInputBridge } from '../src/chart-engine/manual-wall-input-bridge.js';

const listeners = new Set();
const calls = [];
let state = {
  appliedChartData: [{
    barCount: 3,
    paneId: 'default',
    revision: 7,
  }],
  appliedViewport: [{
    chartBarsRevision: 7,
    from: -110,
    origin: 'default',
    paneId: 'default',
    projectionRevision: 0,
    to: 10,
  }],
  panes: [{
    paneId: 'default',
    snapshot: {
      dataLength: 3,
      mounted: true,
      visibleLogicalRange: { from: -110, to: 10 },
    },
  }],
};

const chartSurface = {
  getState() {
    return structuredClone(state);
  },
  subscribeVisibleRangeChange(handler) {
    listeners.add(handler);
    return () => listeners.delete(handler);
  },
};

const bridge = connectManualWallInputBridge({
  chartSurface,
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    if (command === CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION) {
      state = {
        ...state,
        appliedViewport: [{
          chartBarsRevision: payload.chartBarsRevision,
          from: -18,
          origin: 'manual',
          paneId: payload.paneId,
          projectionRevision: 1,
          to: 6,
        }],
      };
    }
    return Promise.resolve({ command, payload });
  },
});

assert.equal(listeners.size, 1);
listeners.forEach((listener) => listener({
  from: -110,
  paneId: 'default',
  to: 10,
}));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(calls, []);

listeners.forEach((listener) => listener({
  from: -18,
  paneId: 'default',
  to: 6,
}));
await new Promise((resolve) => setTimeout(resolve, 0));

assert.deepEqual(calls, [
  {
    command: CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
    payload: {
      latestOffsetBars: 4,
      paneId: 'default',
      spanBars: 24,
    },
  },
  {
    command: CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION,
    payload: {
      chartBarsRevision: 7,
      latestLogicalIndex: 2,
      paneId: 'default',
    },
  },
]);

bridge.destroy();
assert.equal(listeners.size, 0);
listeners.forEach((listener) => listener({
  from: -20,
  paneId: 'default',
  to: 5,
}));
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(calls.length, 2);

console.log('v6 manual wall input bridge smoke passed');
