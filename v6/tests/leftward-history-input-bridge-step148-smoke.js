import assert from 'node:assert/strict';
import { CHART_HISTORY_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

const dispatches = [];
const timers = [];
const clearedTimers = [];
let listener = null;
const chartSurface = {
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

bridge.destroy();
assert.equal(listener, null);

assert.throws(
  () => connectLeftwardHistoryInputBridge({ dispatchCommand: () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectLeftwardHistoryInputBridge({ chartSurface, dispatchCommand: null }),
  /requires dispatchCommand/,
);

console.log('v6 leftward history input bridge step 148 smoke passed');
