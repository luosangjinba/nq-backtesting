import assert from 'node:assert/strict';
import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_EVENTS,
} from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

const dispatches = [];
const timers = [];
const clearedTimers = [];
let listener = null;
const eventListeners = new Map();
let surfaceRange = { from: -8.5, to: 36 };
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

const bridge = connectLeftwardHistoryInputBridge({
  clearTimeoutFn(timer) {
    clearedTimers.push(timer);
  },
  chartSurface,
  dispatchCommand(command, payload) {
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
  targetHistoryActivation: {
    enabled: false,
  },
});

listener({ from: 2, paneId: 'main', to: 42 });
listener({ from: Number.NaN, paneId: 'main', to: 42 });
listener({ from: -3.2, paneId: '', to: 42 });
assert.deepEqual(dispatches, []);

listener({ from: -3.2, paneId: 'main', to: 42 });
assert.deepEqual(dispatches, []);
assert.equal(timers.length, 1);
assert.equal(timers[0].delayMs, 500);

listener({ from: -8.5, paneId: 'main', to: 36 });
assert.equal(timers.length, 2);
assert.deepEqual(clearedTimers, [timers[0]]);

timers[1].callback();
assert.deepEqual(dispatches, [{
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -8.5, to: 36 },
  },
}]);

surfaceRange = { from: -2.5, to: 42 };
eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({ paneId: 'main', status: 'loaded' });
assert.equal(timers.length, 3);
assert.equal(timers[2].delayMs, 0);
timers[2].callback();
assert.equal(timers.length, 4);
assert.equal(timers[3].delayMs, 500);
timers[3].callback();
assert.deepEqual(dispatches.at(-1), {
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -2.5, to: 42 },
  },
});

surfaceRange = { from: -1.5, to: 43 };
eventListeners.get(CHART_VIEWPORT_EVENTS.PROJECTED)({ paneId: 'main' });
assert.equal(timers.length, 5);
assert.equal(timers[4].delayMs, 0);
timers[4].callback();
assert.equal(timers.length, 6);
assert.equal(timers[5].delayMs, 500);
timers[5].callback();
assert.deepEqual(dispatches.at(-1), {
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -1.5, to: 43 },
  },
});

surfaceRange = { from: 0.5, to: 45 };
eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({ paneId: 'main', status: 'loaded' });
assert.equal(timers.length, 7);
assert.equal(timers[6].delayMs, 0);
timers[6].callback();
assert.equal(timers.length, 7);

bridge.destroy();
assert.equal(listener, null);
assert.equal(eventListeners.size, 0);

assert.throws(
  () => connectLeftwardHistoryInputBridge({ dispatchCommand: () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectLeftwardHistoryInputBridge({ chartSurface, dispatchCommand: null }),
  /requires dispatchCommand/,
);

console.log('v6 leftward history input bridge step 148 smoke passed');
