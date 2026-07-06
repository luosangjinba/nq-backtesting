import assert from 'node:assert/strict';
import { CHART_VIEWPORT_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectResetViewControl } from '../src/chart-engine/reset-view-control-bridge.js';

function createFakeButton() {
  const listeners = new Map();
  return {
    dataset: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get('click')?.();
    },
  };
}

const button = createFakeButton();
const calls = [];
const bridge = connectResetViewControl({
  button,
  chartSurface: {
    getState() {
      return {
        appliedChartData: [
          { paneId: 'main', revision: 7 },
        ],
        panes: [
          { paneId: 'main', snapshot: { dataLength: 42 } },
        ],
      };
    },
  },
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    return { ok: true };
  },
});

const result = await bridge.resetView();
assert.deepEqual(result, { ok: true });
assert.deepEqual(calls, [{
  command: CHART_VIEWPORT_COMMANDS.RESET_VIEW,
  payload: {
    chartBarsRevision: 7,
    latestLogicalIndex: 41,
    paneId: 'main',
  },
}]);

button.click();
await Promise.resolve();
assert.equal(calls.length, 2);
assert.deepEqual(calls.at(-1).payload, {
  chartBarsRevision: 7,
  latestLogicalIndex: 41,
  paneId: 'main',
});

bridge.destroy();

console.log('v6 reset view control bridge smoke passed');
