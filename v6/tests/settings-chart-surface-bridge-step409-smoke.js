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
    return Promise.resolve({
      chartAxisBorderColor: '#111111',
      chartBackgroundColor: '#222222',
      chartCrosshairColor: '#333333',
      chartGrid: true,
      chartGridColor: '#444444',
      chartBottomMarginPercent: 8,
      chartNavigationVisibility: 'hover',
      chartScaleFontSize: 12,
      chartScaleTextColor: '#555555',
      chartTopMarginPercent: 10,
      theme: 'dark',
    });
  },
  subscribeEvent(eventName, listener) {
    listeners.set(eventName, listener);
    return () => listeners.delete(eventName);
  },
});

await bridge.ready;
assert.deepEqual(applied, [{
  chartAxisBorderColor: '#111111',
  chartBackgroundColor: '#222222',
  chartCrosshairColor: '#333333',
  chartGrid: true,
  chartGridColor: '#444444',
  chartBottomMarginPercent: 8,
  chartNavigationVisibility: 'hover',
  chartScaleFontSize: 12,
  chartScaleTextColor: '#555555',
  chartTopMarginPercent: 10,
}]);
listeners.get(SETTINGS_EVENTS.UPDATED)({ chartGrid: false, theme: 'light' });
listeners.get(SETTINGS_EVENTS.RESET)({ chartGrid: true, theme: 'dark' });
assert.equal(applied[1].chartGrid, false);
assert.equal(applied[2].chartGrid, true);
assert.deepEqual(Object.keys(applied[1]).sort(), [
  'chartAxisBorderColor',
  'chartBackgroundColor',
  'chartBottomMarginPercent',
  'chartCrosshairColor',
  'chartGrid',
  'chartGridColor',
  'chartNavigationVisibility',
  'chartScaleFontSize',
  'chartScaleTextColor',
  'chartTopMarginPercent',
]);
bridge.destroy();
assert.equal(listeners.size, 0);

console.log('V6 Settings chart surface bridge Step 409 smoke passed.');
