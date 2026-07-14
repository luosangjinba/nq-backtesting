import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../src/contracts/app-contracts.js';
import { connectSettingsSymbolChartSurfaceBridge } from '../src/chart-engine/settings-symbol-chart-surface-bridge.js';

const applied = [];
const listeners = new Map();
const settings = {
  symbolBordersVisible: true,
  symbolDownBodyColor: '#111111',
  symbolDownBorderColor: '#222222',
  symbolDownWickColor: '#333333',
  symbolPricePrecision: '3',
  symbolUpBodyColor: '#aaaaaa',
  symbolUpBorderColor: '#bbbbbb',
  symbolUpWickColor: '#cccccc',
  symbolWicksVisible: false,
};
const bridge = connectSettingsSymbolChartSurfaceBridge({
  chartSurface: { applySymbolSettings: (value) => applied.push(value) },
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
listeners.get(SETTINGS_EVENTS.UPDATED)({ ...settings, symbolBordersVisible: false });
listeners.get(SETTINGS_EVENTS.RESET)(settings);
assert.equal(applied[1].symbolBordersVisible, false);
assert.equal(applied[2].symbolBordersVisible, true);
bridge.destroy();
assert.equal(listeners.size, 0);

console.log('V6 Settings Symbol chart surface bridge Step 413 smoke passed.');
