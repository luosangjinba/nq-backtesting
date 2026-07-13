import assert from 'node:assert/strict';
import {
  CHART_VIEWPORT_COMMANDS,
  SETTINGS_COMMANDS,
  SETTINGS_EVENTS,
} from '../src/contracts/app-contracts.js';
import { connectSettingsChartViewportBridge } from '../src/chart-viewport/settings-chart-viewport-bridge.js';

const listeners = new Map();
const dispatched = [];
const dispatchCommand = async (command, payload) => {
  dispatched.push({ command, payload });
  if (command === SETTINGS_COMMANDS.GET_SNAPSHOT) {
    return { chartRightMarginBars: 8 };
  }
  return [];
};
const subscribeEvent = (eventName, listener) => {
  listeners.set(eventName, listener);
  return () => listeners.delete(eventName);
};

const bridge = connectSettingsChartViewportBridge({ dispatchCommand, subscribeEvent });
await bridge.ready;
assert.deepEqual(dispatched, [
  { command: SETTINGS_COMMANDS.GET_SNAPSHOT, payload: undefined },
  {
    command: CHART_VIEWPORT_COMMANDS.UPDATE_DEFAULT_RIGHT_OFFSET,
    payload: { latestOffsetBars: 8 },
  },
]);

await listeners.get(SETTINGS_EVENTS.UPDATED)({ chartRightMarginBars: 20 });
await listeners.get(SETTINGS_EVENTS.RESET)({ chartRightMarginBars: 8 });
assert.deepEqual(dispatched.slice(-2), [
  {
    command: CHART_VIEWPORT_COMMANDS.UPDATE_DEFAULT_RIGHT_OFFSET,
    payload: { latestOffsetBars: 20 },
  },
  {
    command: CHART_VIEWPORT_COMMANDS.UPDATE_DEFAULT_RIGHT_OFFSET,
    payload: { latestOffsetBars: 8 },
  },
]);

bridge.destroy();
assert.equal(listeners.size, 0);

console.log('v6 settings chart viewport bridge step411 smoke passed');
