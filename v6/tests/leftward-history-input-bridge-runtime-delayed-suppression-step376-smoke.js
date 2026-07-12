import assert from 'node:assert/strict';
import {
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_EVENTS,
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
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function createHarness({
  displayTimeframe = 480,
  targetHistoryActivation = {},
} = {}) {
  const clearRecords = [];
  const dispatches = [];
  const eventListeners = new Map();
  const surface = createSurface();
  const timers = [];

  connectLeftwardHistoryInputBridge({
    chartSurface: surface,
    clearTimeoutFn(timer) {
      timer.cleared = true;
      clearRecords.push(timer);
    },
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
    requestDelayMs: 500,
    setTimeoutFn(callback, delayMs) {
      const timer = { callback, cleared: false, delayMs };
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

  return { clearRecords, dispatches, eventListeners, surface, timers };
}

const previousTrace = globalThis.__v6LeftwardHistoryInputBridgeTrace;
const traceRecords = [];
globalThis.__v6LeftwardHistoryInputBridgeTrace = (record) => {
  traceRecords.push(record);
};

try {
  const loaded = createHarness();
  loaded.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
  await flushMicrotasks();
  assert.equal(loaded.timers.length, 1);
  assert.equal(loaded.timers[0].delayMs, 100);

  loaded.eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({
    paneId: 'main',
    status: 'loaded',
  });
  assert.equal(loaded.timers.length, 2);
  assert.equal(loaded.timers[1].delayMs, 0);
  loaded.timers[1].callback();
  await flushMicrotasks();

  assert.equal(loaded.timers.length, 2);
  assert.equal(loaded.clearRecords.length, 0);
  assert.equal(loaded.timers[0].cleared, false);
  assert.equal(
    traceRecords.some((record) => (
      record.phase === 'schedule-suppressed' &&
      record.reason === 'runtime-left-extension-loaded' &&
      record.existingMode === 'native-target-history-reduced-delay' &&
      record.existingDelayMs === 100
    )),
    true,
  );

  loaded.timers[0].callback();
  assert.equal(loaded.dispatches.length, 1);
  assert.equal(loaded.dispatches[0].command, CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION);
  assert.equal(loaded.dispatches[0].payload.targetHistory.enabled, true);
  assert.equal(loaded.dispatches[0].payload.displayTimeframe, 480);

  traceRecords.length = 0;
  const surfaceCheck = createHarness();
  surfaceCheck.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
  await flushMicrotasks();
  surfaceCheck.eventListeners.get(CHART_VIEWPORT_EVENTS.PROJECTED)({ paneId: 'main' });
  assert.equal(surfaceCheck.timers.length, 2);
  surfaceCheck.timers[1].callback();
  await flushMicrotasks();
  assert.equal(surfaceCheck.timers.length, 2);
  assert.equal(surfaceCheck.clearRecords.length, 0);
  assert.equal(
    traceRecords.some((record) => (
      record.phase === 'schedule-suppressed' &&
      record.reason === 'runtime-surface-check'
    )),
    true,
  );

  const lowTf = createHarness({ displayTimeframe: 5 });
  lowTf.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
  await flushMicrotasks();
  assert.equal(lowTf.timers[0].delayMs, 500);
  lowTf.eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({
    paneId: 'main',
    status: 'loaded',
  });
  lowTf.timers[1].callback();
  await flushMicrotasks();
  assert.equal(lowTf.clearRecords.length, 1);
  assert.equal(lowTf.timers[0].cleared, true);
  assert.equal(lowTf.timers.at(-1).delayMs, 500);

  const disabled = createHarness({
    targetHistoryActivation: { enabled: false },
  });
  disabled.surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
  await flushMicrotasks();
  assert.equal(disabled.timers[0].delayMs, 500);
  disabled.eventListeners.get(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED)({
    paneId: 'main',
    status: 'loaded',
  });
  disabled.timers[1].callback();
  await flushMicrotasks();
  assert.equal(disabled.clearRecords.length, 1);
  assert.equal(disabled.timers[0].cleared, true);
  assert.equal(disabled.timers.at(-1).delayMs, 500);
} finally {
  if (previousTrace === undefined) {
    delete globalThis.__v6LeftwardHistoryInputBridgeTrace;
  } else {
    globalThis.__v6LeftwardHistoryInputBridgeTrace = previousTrace;
  }
}

console.log('v6 leftward history input bridge runtime delayed suppression step376 smoke passed');
