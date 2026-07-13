import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LOADED_WINDOW_DATE_LOCATOR_COMMANDS,
  LOADED_WINDOW_DATE_LOCATOR_EVENTS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createLoadedWindowDateLocatorRuntime } from '../src/date-locator/loaded-window-date-locator-runtime.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';

const calls = [];
const events = [];
const fakeDispatch = async (command, payload) => {
  calls.push({ command, payload });
  if (command === PANE_COMMANDS.GET_ACTIVE) return { id: 'secondary' };
  if (command === CHART_DATA_COMMANDS.GET_BARS) {
    return {
      bars: [100, 200, 400, 500].map((timestamp) => ({ timestamp })),
      paneId: 'secondary',
      revision: 7,
    };
  }
  if (command === CHART_VIEWPORT_COMMANDS.GET_PANE) {
    return { intent: { spanBars: 4 }, paneId: 'secondary', projection: null };
  }
  if (command === CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT) return { paneId: 'secondary' };
  if (command === CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION) {
    return { paneId: 'secondary', projection: { from: 0, spanBars: 4, to: 4 } };
  }
  throw new Error(`Unexpected dependency command: ${command}`);
};

clearCommandsForTest();
const runtime = createLoadedWindowDateLocatorRuntime({ dispatchCommand: fakeDispatch });
runtime.start({ emitEvent: (name, payload) => events.push({ name, payload }) });

const located = await dispatchCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.LOCATE, {
  requestedTimestamp: 400,
});
assert.equal(located.status, 'located');
assert.equal(located.paneId, 'secondary');
assert.equal(located.resolvedTimestamp, 400);
assert.deepEqual(calls.map(({ command }) => command), [
  PANE_COMMANDS.GET_ACTIVE,
  CHART_DATA_COMMANDS.GET_BARS,
  CHART_VIEWPORT_COMMANDS.GET_PANE,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION,
]);
assert.deepEqual(calls.at(-2).payload, {
  latestOffsetBars: 1,
  paneId: 'secondary',
  spanBars: 4,
});
assert.equal(events.at(-1).name, LOADED_WINDOW_DATE_LOCATOR_EVENTS.LOCATED);
assert.deepEqual(await dispatchCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.GET_STATE), located);

calls.length = 0;
const rejected = await dispatchCommand(LOADED_WINDOW_DATE_LOCATOR_COMMANDS.LOCATE, {
  requestedTimestamp: 50,
});
assert.equal(rejected.status, 'rejected');
assert.equal(rejected.reason, 'outside-loaded-window');
assert.deepEqual(calls.map(({ command }) => command), [
  PANE_COMMANDS.GET_ACTIVE,
  CHART_DATA_COMMANDS.GET_BARS,
  CHART_VIEWPORT_COMMANDS.GET_PANE,
]);
assert.equal(events.at(-1).name, LOADED_WINDOW_DATE_LOCATOR_EVENTS.REJECTED);

runtime.stop();
clearCommandsForTest();

console.log('v6 loaded-window date locator runtime step402 smoke passed');
