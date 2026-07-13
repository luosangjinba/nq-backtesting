import assert from 'node:assert/strict';

import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
} from '../src/contracts/app-contracts.js';
import {
  connectLeftwardHistoryInputBridge,
  DEFAULT_LEFTWARD_HISTORY_PREFETCH_THRESHOLD_BARS,
} from '../src/chart-history/leftward-history-input-bridge.js';

const dispatches = [];
const eventListeners = new Map();
const timers = [];
let surfaceRange = { from: 12, to: 92 };
let visibleListener;

const bridge = connectLeftwardHistoryInputBridge({
  chartSurface: {
    getState: () => ({ measuredVisibleRange: [{ paneId: 'main', ...surfaceRange }] }),
    subscribeVisibleRangeChange(handler) {
      visibleListener = handler;
      return () => {};
    },
  },
  dispatchCommand(command, payload) {
    dispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
  requestDelayMs: 0,
  setTimeoutFn(callback, delayMs) {
    const timer = { callback, delayMs };
    timers.push(timer);
    return timer;
  },
  subscribeEvent(name, handler) {
    eventListeners.set(name, handler);
    return () => {};
  },
  targetHistoryActivation: { enabled: false },
});

assert.equal(DEFAULT_LEFTWARD_HISTORY_PREFETCH_THRESHOLD_BARS, 24);
visibleListener({ from: 12, paneId: 'main', to: 92 });
assert.equal(dispatches.length, 1);
assert.equal(dispatches[0].command, CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION);

surfaceRange = { from: 18, to: 98 };
eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({ paneId: 'main', status: 'loaded' });
timers.shift().callback();
assert.equal(dispatches.length, 2);

surfaceRange = { from: 40, to: 120 };
eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({ paneId: 'main', status: 'loaded' });
timers.shift().callback();
assert.equal(dispatches.length, 2);

bridge.destroy();
console.log('v6 leftward history prefetch threshold step399 smoke passed');
