import assert from 'node:assert/strict';
import { PANE_COMMANDS, PANE_EVENTS } from '../src/contracts/app-contracts.js';
import { connectDisplayTimeframePaneTargetBridge } from '../src/shell/display-timeframe-pane-target-bridge.js';

const calls = [];
const listeners = new Map();
const control = {
  setDisplayTimeframe(displayTimeframe) {
    calls.push({ displayTimeframe, method: 'setDisplayTimeframe' });
    return displayTimeframe;
  },
  setTargetPaneId(paneId) {
    calls.push({ method: 'setTargetPaneId', paneId });
    return paneId;
  },
};

const bridge = connectDisplayTimeframePaneTargetBridge({
  displayTimeframeControl: control,
  dispatchCommand(command) {
    calls.push({ command });
    assert.equal(command, PANE_COMMANDS.GET_ACTIVE);
    return { displayTimeframe: 1, id: 'main' };
  },
  subscribeEvent(eventName, handler) {
    listeners.set(eventName, handler);
    return () => calls.push({ eventName, method: 'unsubscribe' });
  },
});

await bridge.ready;
assert.deepEqual(calls, [
  { command: PANE_COMMANDS.GET_ACTIVE },
  { method: 'setTargetPaneId', paneId: 'main' },
  { displayTimeframe: 1, method: 'setDisplayTimeframe' },
]);

listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({ displayTimeframe: 5, id: 'secondary' });
listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({ displayTimeframe: 15, paneId: 'tertiary' });
listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({});
assert.deepEqual(calls.slice(3), [
  { method: 'setTargetPaneId', paneId: 'secondary' },
  { displayTimeframe: 5, method: 'setDisplayTimeframe' },
  { method: 'setTargetPaneId', paneId: 'tertiary' },
  { displayTimeframe: 15, method: 'setDisplayTimeframe' },
]);

bridge.destroy();
listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({ id: 'main' });
assert.deepEqual(calls.at(-1), {
  eventName: PANE_EVENTS.ACTIVE_CHANGED,
  method: 'unsubscribe',
});

console.log('v6 display timeframe pane target bridge step 207 smoke passed');
