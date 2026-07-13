import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../src/contracts/app-contracts.js';
import { connectSettingsChartSurfaceBridge } from '../src/chart-engine/settings-chart-surface-bridge.js';

const applied = [];
const listeners = new Map();
const bridge = connectSettingsChartSurfaceBridge({
  chartSurface: {
    applySettings(settings) {
      applied.push(settings);
      return settings;
    },
  },
  dispatchCommand(command) {
    assert.equal(command, SETTINGS_COMMANDS.GET_SNAPSHOT);
    return Promise.resolve({ chartGrid: true, theme: 'dark' });
  },
  subscribeEvent(eventName, listener) {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});

await bridge.ready;
assert.deepEqual(applied, [{ chartGrid: true }]);
listeners.get(SETTINGS_EVENTS.UPDATED)({ chartGrid: false, theme: 'light' });
listeners.get(SETTINGS_EVENTS.RESET)({ chartGrid: true, theme: 'dark' });
assert.deepEqual(applied, [
  { chartGrid: true },
  { chartGrid: false },
  { chartGrid: true },
]);
bridge.destroy();
assert.equal(listeners.size, 0);

console.log('V6 Settings chart surface bridge Step 409 smoke passed.');
