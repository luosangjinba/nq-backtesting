import assert from 'node:assert/strict';
import { DISPLAY_TIMEFRAME_COMMANDS } from '../src/contracts/app-contracts.js';
import { mountDisplayTimeframeControl } from '../src/shell/display-timeframe-control.js';

function createFakeSelect() {
  const listeners = new Map();
  return {
    value: '1',
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    change(value) {
      this.value = value;
      listeners.get('change')?.();
    },
  };
}

const select = createFakeSelect();
const root = {
  dataset: {},
  querySelector(selector) {
    if (selector === '[data-v6-display-timeframe-select]') return select;
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
const dispatched = [];
const control = mountDisplayTimeframeControl(root, {
  dispatchCommand: async (command, payload) => {
    dispatched.push({ command, payload });
  },
});

assert.equal(control.getValue(), 1);
assert.equal(control.getTargetPaneId(), 'main');
assert.equal(root.dataset.displayTimeframe, '1');
assert.equal(root.dataset.v6DisplayTimeframePaneId, 'main');
assert.equal(control.setDisplayTimeframe(30), 30);
assert.equal(control.getValue(), 30);
assert.equal(root.dataset.displayTimeframe, '30');
select.change('5');
await Promise.resolve();
assert.deepEqual(dispatched, [
  {
    command: DISPLAY_TIMEFRAME_COMMANDS.APPLY,
    payload: { displayTimeframe: 5, paneId: 'main' },
  },
]);
assert.equal(root.dataset.displayTimeframe, '5');
assert.equal(root.dataset.v6DisplayTimeframePaneId, 'main');

control.setTargetPaneId('secondary');
control.setDisplayTimeframe(1);
select.change('15');
await Promise.resolve();
assert.deepEqual(dispatched.at(-1), {
  command: DISPLAY_TIMEFRAME_COMMANDS.APPLY,
  payload: { displayTimeframe: 15, paneId: 'secondary' },
});
assert.equal(root.dataset.displayTimeframe, '15');
assert.equal(root.dataset.v6DisplayTimeframePaneId, 'secondary');

control.destroy();

console.log('v6 display timeframe control smoke passed');
