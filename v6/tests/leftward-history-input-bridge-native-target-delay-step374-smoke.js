import assert from 'node:assert/strict';
import {
  CHART_HISTORY_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
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
      return { measuredVisibleRange: [{ from: -4, paneId: 'main', to: 30 }], panes: [] };
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

function createHarness({
  displayTimeframe = 480,
  requestDelayMs = 500,
  targetHistoryActivation = {},
} = {}) {
  const dispatches = [];
  const timers = [];
  const eventListeners = new Map();
  const surface = createSurface();
  connectLeftwardHistoryInputBridge({
    chartSurface: surface,
    dispatchCommand(command, payload) {
      if (command === PANE_COMMANDS.GET_BY_ID) {
        return Promise.resolve({
          displayTimeframe,
          id: payload,
          instrument: 'NQ',
          timeframe: 1,
        });
      }
      dispatches.push({ command, payload });
      return Promise.resolve({ status: 'loaded' });
    },
    requestDelayMs,
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
    targetHistoryActivation,
  });
  return { dispatches, eventListeners, surface, timers };
}

const highTf = createHarness();
highTf.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.equal(highTf.timers.length, 1);
assert.equal(highTf.timers[0].delayMs, 100);
highTf.timers[0].callback();
assert.deepEqual(highTf.dispatches, [{
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

const configuredDelay = createHarness({
  targetHistoryActivation: { nativeTargetHistoryDelayMs: 125 },
});
configuredDelay.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.equal(configuredDelay.timers.length, 1);
assert.equal(configuredDelay.timers[0].delayMs, 125);

const lowTf = createHarness({ displayTimeframe: 5 });
lowTf.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.equal(lowTf.timers.length, 1);
assert.equal(lowTf.timers[0].delayMs, 100);

const disabled = createHarness({
  displayTimeframe: 480,
  targetHistoryActivation: { enabled: false },
});
disabled.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
await flushMicrotasks();
assert.equal(disabled.timers.length, 1);
assert.equal(disabled.timers[0].delayMs, 500);

const programmatic = createHarness();
programmatic.eventListeners.get(DISPLAY_TIMEFRAME_EVENTS.APPLIED)({ pane: { id: 'main' } });
assert.equal(programmatic.timers.length, 1);
assert.equal(programmatic.timers[0].delayMs, 0);
programmatic.timers[0].callback();
await flushMicrotasks();
assert.equal(programmatic.timers.length, 1);
assert.equal(programmatic.dispatches.length, 1);

console.log('v6 leftward history input bridge native target delay step374 smoke passed');
