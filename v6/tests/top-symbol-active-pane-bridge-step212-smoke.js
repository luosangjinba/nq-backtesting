import assert from 'node:assert/strict';
import { PANE_COMMANDS, PANE_EVENTS } from '../src/contracts/app-contracts.js';
import { connectTopSymbolActivePaneBridge } from '../src/shell/top-symbol-active-pane-bridge.js';

const listeners = new Map();
const commands = [];
const element = {
  dataset: {},
  textContent: '',
};

const bridge = connectTopSymbolActivePaneBridge({
  dispatchCommand(command) {
    commands.push(command);
    assert.equal(command, PANE_COMMANDS.GET_ACTIVE);
    return { displayTimeframe: 1, id: 'main', instrument: 'NQ' };
  },
  subscribeEvent(eventName, handler) {
    listeners.set(eventName, handler);
    return () => listeners.delete(eventName);
  },
  symbolElement: element,
});

await bridge.ready;

assert.deepEqual(commands, [PANE_COMMANDS.GET_ACTIVE]);
assert.equal(element.textContent, 'NQ');
assert.equal(element.dataset.v6TopSymbol, 'NQ');
assert.equal(listeners.has(PANE_EVENTS.ACTIVE_CHANGED), true);
assert.equal(listeners.has(PANE_EVENTS.SYMBOL_INTENT_CHANGED), true);

listeners.get(PANE_EVENTS.SYMBOL_INTENT_CHANGED)({
  id: 'secondary',
  instrument: 'ES',
});
assert.equal(element.textContent, 'NQ');

listeners.get(PANE_EVENTS.ACTIVE_CHANGED)({
  id: 'secondary',
  instrument: 'ES',
});
assert.equal(element.textContent, 'ES');
assert.equal(element.dataset.v6TopSymbol, 'ES');

listeners.get(PANE_EVENTS.SYMBOL_INTENT_CHANGED)({
  id: 'secondary',
  instrument: 'ym',
});
assert.equal(element.textContent, 'YM');
assert.equal(element.dataset.v6TopSymbol, 'YM');

bridge.destroy();
assert.equal(listeners.size, 0);

console.log('v6 top symbol active pane bridge step 212 smoke passed');
