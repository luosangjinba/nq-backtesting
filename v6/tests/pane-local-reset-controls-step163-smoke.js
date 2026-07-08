import assert from 'node:assert/strict';
import { CHART_VIEWPORT_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectResetViewControl } from '../src/chart-engine/reset-view-control-bridge.js';

function createFakeButton(paneId) {
  const listeners = new Map();
  return {
    dataset: { v6ResetPaneId: paneId },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    click() {
      listeners.get('click')?.();
    },
  };
}

const calls = [];
const chartSurface = {
  getState() {
    return {
      appliedChartData: [
        { paneId: 'main', revision: 3 },
        { paneId: 'secondary', revision: 5 },
      ],
      panes: [
        { paneId: 'main', snapshot: { dataLength: 10 } },
        { paneId: 'secondary', snapshot: { dataLength: 18 } },
      ],
    };
  },
};

const mainControl = connectResetViewControl({
  button: createFakeButton('main'),
  chartSurface,
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    return { command, payload };
  },
  paneId: 'main',
});
const secondaryButton = createFakeButton('secondary');
const secondaryControl = connectResetViewControl({
  button: secondaryButton,
  chartSurface,
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    return { command, payload };
  },
  paneId: 'secondary',
});

await secondaryControl.resetView();
assert.deepEqual(calls.at(-1), {
  command: CHART_VIEWPORT_COMMANDS.RESET_VIEW,
  payload: {
    chartBarsRevision: 5,
    latestLogicalIndex: 17,
    paneId: 'secondary',
  },
});

secondaryButton.click();
await Promise.resolve();
assert.equal(calls.at(-1).payload.paneId, 'secondary');

await mainControl.resetView();
assert.deepEqual(calls.at(-1).payload, {
  chartBarsRevision: 3,
  latestLogicalIndex: 9,
  paneId: 'main',
});

mainControl.destroy();
secondaryControl.destroy();

console.log('v6 pane-local reset controls step 163 smoke passed');
