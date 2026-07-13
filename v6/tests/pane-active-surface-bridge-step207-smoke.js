import assert from 'node:assert/strict';
import { PANE_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectPaneActiveSurfaceBridge } from '../src/chart-engine/pane-active-surface-bridge.js';

const calls = [];
const listeners = [];
let runtimeListener = null;
const chartSurface = {
  applyActivePane(paneId) {
    calls.push({ method: 'applyActivePane', paneId });
  },
  subscribePaneActivation(handler) {
    listeners.push(handler);
    return () => calls.push({ method: 'unsubscribe' });
  },
};

const bridge = connectPaneActiveSurfaceBridge({
  chartSurface,
  dispatchCommand(command, payload) {
    calls.push({ command, payload });
    if (command === PANE_COMMANDS.GET_ACTIVE) return { id: 'main' };
    return { id: payload };
  },
  subscribeEvent(_event, listener) {
    runtimeListener = listener;
    return () => calls.push({ method: 'unsubscribeRuntime' });
  },
});
await bridge.ready;

assert.equal(listeners.length, 1);
listeners[0]({ origin: 'pointerdown', paneId: 'secondary' });
listeners[0]({ paneId: '' });
assert.deepEqual(calls, [
  { command: PANE_COMMANDS.GET_ACTIVE, payload: undefined },
  { method: 'applyActivePane', paneId: 'main' },
  { command: PANE_COMMANDS.SET_ACTIVE, payload: 'secondary' },
]);

runtimeListener({ id: 'secondary' });
assert.deepEqual(calls.at(-1), { method: 'applyActivePane', paneId: 'secondary' });

bridge.destroy();
listeners[0]({ paneId: 'main' });
assert.deepEqual(calls, [
  { command: PANE_COMMANDS.GET_ACTIVE, payload: undefined },
  { method: 'applyActivePane', paneId: 'main' },
  { command: PANE_COMMANDS.SET_ACTIVE, payload: 'secondary' },
  { method: 'applyActivePane', paneId: 'secondary' },
  { method: 'unsubscribe' },
  { method: 'unsubscribeRuntime' },
]);

console.log('v6 pane active surface bridge step 207 smoke passed');
