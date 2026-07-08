import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  CHART_VIEWPORT_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';

clearCommandsForTest();

const listeners = new Map();
const emitted = [];
const runtime = createChartViewportRuntime();
runtime.start({
  emitEvent(eventName, payload) {
    emitted.push({ eventName, payload });
  },
  subscribeEvent(eventName, handler) {
    const handlers = listeners.get(eventName) || new Set();
    handlers.add(handler);
    listeners.set(eventName, handlers);
    return () => handlers.delete(handler);
  },
});

function emit(eventName, payload) {
  for (const handler of listeners.get(eventName) || []) {
    handler(payload);
  }
}

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'main',
  spanBars: 80,
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
  chartBarsRevision: 1,
  latestLogicalIndex: 79,
  paneId: 'main',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 4,
  paneId: 'main',
  spanBars: 80,
});
const projectedBeforePrependCount = emitted
  .filter((event) => event.eventName === CHART_VIEWPORT_EVENTS.PROJECTED)
  .length;

emit(CHART_DATA_EVENTS.BARS_CHANGED, {
  operation: 'prepend',
  record: {
    bars: Array.from({ length: 100 }, (_, index) => ({ timestamp: index })),
    paneId: 'main',
    revision: 2,
  },
});
assert.equal(
  emitted.filter((event) => event.eventName === CHART_VIEWPORT_EVENTS.PROJECTED).length,
  projectedBeforePrependCount,
);

emit(CHART_DATA_EVENTS.BARS_CHANGED, {
  operation: 'append',
  record: {
    bars: Array.from({ length: 101 }, (_, index) => ({ timestamp: index })),
    paneId: 'main',
    revision: 3,
  },
});
const projected = emitted
  .filter((event) => event.eventName === CHART_VIEWPORT_EVENTS.PROJECTED)
  .at(-1);
assert.equal(projected.payload.chartBarsRevision, 3);
assert.equal(projected.payload.projection.origin, 'manual');
assert.equal(projected.payload.projection.to, 104);

runtime.stop();
clearCommandsForTest();

console.log('v6 chart viewport prepend manual stability smoke passed');
