import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../src/contracts/app-contracts.js';
import { connectSettingsStatusReadoutBridge } from '../src/shell/settings-status-readout-bridge.js';

const applied = [];
const listeners = new Map();
const settings = {
  statusBackgroundColor: '#112233',
  statusBackgroundOpacityPercent: 40,
  statusBarChangeVisible: true,
  statusOhlcVisible: false,
  statusTitleMode: 'ticker',
};
const bridge = connectSettingsStatusReadoutBridge({
  statusReadout: { applySettings: (value) => applied.push(value) },
  dispatchCommand(command) {
    assert.equal(command, SETTINGS_COMMANDS.GET_SNAPSHOT);
    return Promise.resolve(settings);
  },
  subscribeEvent(eventName, listener) {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});

await bridge.ready;
assert.deepEqual(applied, [settings]);
listeners.get(SETTINGS_EVENTS.UPDATED)({ ...settings, statusTitleMode: 'hidden' });
listeners.get(SETTINGS_EVENTS.RESET)(settings);
assert.equal(applied[1].statusTitleMode, 'hidden');
assert.equal(applied[2].statusTitleMode, 'ticker');
bridge.destroy();
assert.equal(listeners.size, 0);

console.log('V6 Settings Status Readout bridge Step 414 smoke passed.');
