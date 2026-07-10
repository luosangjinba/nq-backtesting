import assert from 'node:assert/strict';
import {
  CHART_HISTORY_COMMANDS,
  PANE_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

function createSurface() {
  let listener = null;
  return {
    emitVisibleRange(event) {
      listener?.(event);
    },
    getState() {
      return { measuredVisibleRange: [], panes: [] };
    },
    subscribeVisibleRangeChange(handler) {
      listener = handler;
      return () => {
        listener = null;
      };
    },
  };
}

async function flushMicrotasks() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

const highTfDispatches = [];
const highTfTimers = [];
const highTfSurface = createSurface();
connectLeftwardHistoryInputBridge({
  chartSurface: highTfSurface,
  dispatchCommand(command, payload) {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return Promise.resolve({ displayTimeframe: 480, id: payload, instrument: 'NQ' });
    }
    highTfDispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
  requestDelayMs: 0,
  setTimeoutFn(callback, delayMs) {
    highTfTimers.push({ callback, delayMs });
    callback();
    return { callback, delayMs };
  },
  subscribeEvent() {
    return () => {};
  },
});

highTfSurface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.deepEqual(highTfDispatches, [{
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    displayTimeframe: 480,
    paneId: 'main',
    targetHistory: {
      enabled: true,
      policy: 'high-timeframe-leftward-history',
      reason: 'target-history-high-timeframe-policy',
    },
    visibleRange: { from: -4, to: 30 },
  },
}]);

const lowTfDispatches = [];
const lowTfSurface = createSurface();
connectLeftwardHistoryInputBridge({
  chartSurface: lowTfSurface,
  dispatchCommand(command, payload) {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return Promise.resolve({ displayTimeframe: 5, id: payload, instrument: 'NQ' });
    }
    lowTfDispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
  requestDelayMs: 0,
  subscribeEvent() {
    return () => {};
  },
});
lowTfSurface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.deepEqual(lowTfDispatches, [{
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -4, to: 30 },
  },
}]);

const disabledDispatches = [];
const disabledSurface = createSurface();
connectLeftwardHistoryInputBridge({
  chartSurface: disabledSurface,
  dispatchCommand(command, payload) {
    if (command === PANE_COMMANDS.GET_BY_ID) {
      return Promise.resolve({ displayTimeframe: 480, id: payload, instrument: 'NQ' });
    }
    disabledDispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
  requestDelayMs: 0,
  subscribeEvent() {
    return () => {};
  },
  targetHistoryActivation: {
    enabled: false,
  },
});
disabledSurface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.deepEqual(disabledDispatches, [{
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -4, to: 30 },
  },
}]);

console.log('v6 leftward history input target activation step286 smoke passed');
