import assert from 'node:assert/strict';
import { CHART_HISTORY_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

const dispatches = [];
const timers = [];
const clearedTimers = [];
let listener = null;
let loadedListener = null;
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
    loadedListener = handler;
    return () => {
      loadedListener = null;
    };
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
loadedListener({ paneId: 'main', status: 'loaded' });
assert.equal(timers.length, 3);
assert.equal(timers[2].delayMs, 500);
timers[2].callback();
assert.deepEqual(dispatches.at(-1), {
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -2.5, to: 42 },
  },
});

surfaceRange = { from: 0.5, to: 45 };
loadedListener({ paneId: 'main', status: 'loaded' });
assert.equal(timers.length, 3);

bridge.destroy();
assert.equal(listener, null);
assert.equal(loadedListener, null);

assert.throws(
  () => connectLeftwardHistoryInputBridge({ dispatchCommand: () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectLeftwardHistoryInputBridge({ chartSurface, dispatchCommand: null }),
  /requires dispatchCommand/,
);

console.log('v6 leftward history input bridge step 148 smoke passed');
