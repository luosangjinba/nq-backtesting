import assert from 'node:assert/strict';
import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_EVENTS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

const dispatches = [];
const timers = [];
const eventListeners = new Map();
let listener = null;
let surfaceRange = { from: -4, to: 42 };
let displayTimeframe = 480;

const chartSurface = {
  getState() {
    return {
      measuredVisibleRange: [{ paneId: 'main', ...surfaceRange }],
      panes: [],
    };
  },
  subscribeVisibleRangeChange(handler) {
    listener = handler;
    return () => {
      listener = null;
    };
  },
};

connectLeftwardHistoryInputBridge({
  chartSurface,
  dispatchCommand(command, payload) {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return Promise.resolve({
        displayTimeframe,
        id: payload,
        timeframe: 1,
      });
    }
    dispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
  requestDelayMs: 500,
  setTimeoutFn(callback, delayMs) {
    const timer = { callback, delayMs };
    timers.push(timer);
    return timer;
  },
  subscribeEvent(eventName, handler) {
    eventListeners.set(eventName, handler);
    return () => {
      eventListeners.delete(eventName);
    };
  },
});

listener({ from: -2, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.equal(dispatches.length, 0);
assert.equal(timers.length, 1);
assert.equal(timers[0].delayMs, 500);
timers[0].callback();
assert.equal(dispatches.length, 1);
assert.equal(dispatches.at(-1).command, CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION);

dispatches.length = 0;
timers.length = 0;
surfaceRange = { from: -6, to: 34 };
displayTimeframe = 480;
eventListeners.get(DISPLAY_TIMEFRAME_EVENTS.APPLIED)({
  pane: { id: 'main' },
});
assert.equal(timers.length, 1);
assert.equal(timers[0].delayMs, 0);
timers[0].callback();
await flushMicrotasks();
assert.equal(timers.length, 1);
assert.equal(dispatches.length, 1);
assert.deepEqual(dispatches.at(-1), {
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    displayTimeframe: 480,
    paneId: 'main',
    targetHistory: {
      enabled: true,
      policy: 'high-timeframe-leftward-history',
      reason: 'target-history-high-timeframe-policy',
    },
    visibleRange: { from: -6, to: 34 },
  },
});
eventListeners.get(CHART_VIEWPORT_EVENTS.PROJECTED)({ paneId: 'main' });
timers.at(-1).callback();
await flushMicrotasks();
assert.equal(dispatches.length, 1);
eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({ paneId: 'main', status: 'loaded' });

dispatches.length = 0;
timers.length = 0;
surfaceRange = { from: -3, to: 28 };
displayTimeframe = '1D';
eventListeners.get(CHART_VIEWPORT_EVENTS.PROJECTED)({ paneId: 'main' });
assert.equal(timers.length, 1);
assert.equal(timers[0].delayMs, 0);
timers[0].callback();
await flushMicrotasks();
assert.equal(dispatches.length, 0);
assert.equal(timers.length, 2);
assert.equal(timers[1].delayMs, 500);

dispatches.length = 0;
timers.length = 0;
surfaceRange = { from: -3, to: 28 };
displayTimeframe = 5;
eventListeners.get(DISPLAY_TIMEFRAME_EVENTS.APPLIED)({
  pane: { id: 'main' },
});
assert.equal(timers.length, 1);
assert.equal(timers[0].delayMs, 0);
timers[0].callback();
await flushMicrotasks();
assert.equal(dispatches.length, 0);
assert.equal(timers.length, 2);
assert.equal(timers[1].delayMs, 500);

console.log('v6 leftward history input bridge fast path step326 smoke passed');
