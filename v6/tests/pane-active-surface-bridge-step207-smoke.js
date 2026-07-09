import assert from 'node:assert/strict';
import { PANE_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectPaneActiveSurfaceBridge } from '../src/chart-engine/pane-active-surface-bridge.js';

const calls = [];
const listeners = [];
const chartSurface = {
  subscribePaneActivation(handler) {
    listeners.push(handler);
    return () => calls.push({ method: 'unsubscribe' });
  },
};

const bridge = connectPaneActiveSurfaceBridge({
  chartSurface,
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    return { id: payload };
  },
});

assert.equal(listeners.length, 1);
listeners[0]({ origin: 'pointerdown', paneId: 'secondary' });
listeners[0]({ paneId: '' });
assert.deepEqual(calls, [
  { command: PANE_COMMANDS.SET_ACTIVE, payload: 'secondary' },
]);

bridge.destroy();
listeners[0]({ paneId: 'main' });
assert.deepEqual(calls, [
  { command: PANE_COMMANDS.SET_ACTIVE, payload: 'secondary' },
  { method: 'unsubscribe' },
]);

console.log('v6 pane active surface bridge step 207 smoke passed');
