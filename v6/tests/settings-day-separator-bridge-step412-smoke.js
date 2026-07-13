import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  SETTINGS_COMMANDS,
  SETTINGS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { connectSettingsDaySeparatorBridge } from '../src/session-calendar/settings-day-separator-bridge.js';

const applied = [];
const listeners = new Map();
const settings = {
  chartDaySeparators: 'both',
  chartIctDaySeparatorColor: '#a855f7',
  chartIctDaySeparatorStyle: 'dotted',
  chartTradingDaySeparatorColor: '#3b82f6',
  chartTradingDaySeparatorStyle: 'dashed',
};
const bridge = connectSettingsDaySeparatorBridge({
  chartSurface: {
    applyDaySeparators(paneId, lines, options) {
      applied.push({ lines, options, paneId });
    },
  },
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
listeners.get(CHART_DATA_EVENTS.BARS_CHANGED)({
  record: {
    bars: Array.from({ length: 24 }, (_, index) => ({
      timestamp: (Date.parse('2026-03-08T00:00:00Z') / 1000) + (index * 3600),
    })),
    paneId: 'main',
  },
});
assert.equal(applied.at(-1).paneId, 'main');
assert.equal(applied.at(-1).lines.length, 2);
assert.equal(applied.at(-1).options.mode, 'both');

listeners.get(SETTINGS_EVENTS.UPDATED)({ ...settings, chartDaySeparators: 'off' });
assert.equal(applied.at(-1).lines.length, 0);
assert.equal(applied.at(-1).options.mode, 'off');
bridge.destroy();
assert.equal(listeners.size, 0);

console.log('V6 Settings day separator bridge Step 412 smoke passed.');
