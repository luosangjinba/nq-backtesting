import assert from 'node:assert/strict';
import {
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

const previousTrace = globalThis.__v6LeftwardHistoryInputBridgeTrace;
const traceRecords = [];
globalThis.__v6LeftwardHistoryInputBridgeTrace = (record) => {
  traceRecords.push(record);
};

try {
  const timers = [];
  const eventListeners = new Map();
  const surface = createSurface();
  connectLeftwardHistoryInputBridge({
    chartSurface: surface,
    dispatchCommand(command, payload) {
      if (command === PANE_COMMANDS.GET_BY_ID) {
        return Promise.resolve({
          displayTimeframe: 480,
          id: payload,
          instrument: 'NQ',
          timeframe: 1,
        });
      }
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
      return () => {};
    },
  });

  surface.emitVisibleRange({ from: -4, paneId: 'main', to: 30 });
  await flushMicrotasks();
  const nativeResolved = traceRecords.find((record) => record.phase === 'schedule-resolved');
  assert.deepEqual(nativeResolved, {
    activationDisplayTimeframe: 480,
    activationStatus: 'enabled',
    delayMs: 100,
    mode: 'native-target-history-reduced-delay',
    nativeTargetHistoryDelayMs: 100,
    paneId: 'main',
    phase: 'schedule-resolved',
    reason: 'native-target-history-reduced-delay-with-coalescing',
    requestedReason: 'native-visible-range',
    resolvedReason: 'native-visible-range',
    source: 'leftward-history-input-bridge',
    targetHistoryEnabled: true,
  });
  assert.deepEqual(
    traceRecords.find((record) => record.phase === 'timer-scheduled'),
    {
      delayMs: 100,
      mode: 'native-target-history-reduced-delay',
      paneId: 'main',
      phase: 'timer-scheduled',
      reason: 'native-target-history-reduced-delay-with-coalescing',
      source: 'leftward-history-input-bridge',
      targetHistoryEnabled: true,
    },
  );

  traceRecords.length = 0;
  eventListeners.get(DISPLAY_TIMEFRAME_EVENTS.APPLIED)({ pane: { id: 'main' } });
  assert.equal(timers.at(-1).delayMs, 0);
  timers.at(-1).callback();
  await flushMicrotasks();
  const programmaticResolved = traceRecords.find((record) => record.phase === 'schedule-resolved');
  assert.equal(programmaticResolved.requestedReason, 'runtime-display-timeframe-applied');
  assert.equal(programmaticResolved.resolvedReason, 'runtime-display-timeframe-applied');
  assert.equal(programmaticResolved.mode, 'programmatic-target-history-fast-path');
  assert.equal(programmaticResolved.delayMs, 0);
  assert.equal(programmaticResolved.nativeTargetHistoryDelayMs, null);
} finally {
  if (previousTrace === undefined) {
    delete globalThis.__v6LeftwardHistoryInputBridgeTrace;
  } else {
    globalThis.__v6LeftwardHistoryInputBridgeTrace = previousTrace;
  }
}

console.log('v6 leftward history input bridge schedule branch attribution step375 smoke passed');
