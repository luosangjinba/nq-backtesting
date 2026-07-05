import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  REPLAY_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartViewportRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'pane-left',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'pane-right',
});

for (const paneId of ['pane-left', 'pane-right']) {
  emitEvent(CHART_DATA_EVENTS.BARS_CHANGED, {
    operation: 'replace',
    record: {
      bars: [
        { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
        { close: 101.5, high: 102, low: 100, open: 101, timestamp: 1780306260 },
      ],
      paneId,
      revision: 1,
    },
  });
}

const manualRight = await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 3,
  paneId: 'pane-right',
  spanBars: 40,
});
assert.equal(manualRight.intent.origin, 'manual');
assert.equal(manualRight.intent.revision, 1);

let left = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-left' });
let right = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-right' });
assert.equal(left.intent.origin, 'default');
assert.equal(left.intent.revision, 0);
assert.equal(right.intent.origin, 'manual');
assert.equal(right.intent.revision, 1);

emitEvent(REPLAY_EVENTS.ADVANCED, {
  cursorTime: '2026-06-01T09:32:00.000Z',
});
for (const paneId of ['pane-left', 'pane-right']) {
  emitEvent(CHART_DATA_EVENTS.BARS_CHANGED, {
    operation: 'append',
    record: {
      bars: [
        { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
        { close: 101.5, high: 102, low: 100, open: 101, timestamp: 1780306260 },
        { close: 102.5, high: 103, low: 101, open: 102, timestamp: 1780306320 },
      ],
      paneId,
      revision: 2,
    },
  });
}

left = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-left' });
right = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-right' });
assert.equal(left.intent.origin, 'default');
assert.equal(left.intent.revision, 0);
assert.deepEqual(left.projection, {
  from: -110,
  latestLogicalIndex: 2,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 10,
});
assert.equal(right.intent.origin, 'manual');
assert.equal(right.intent.revision, 1);
assert.deepEqual(right.projection, {
  from: -35,
  latestLogicalIndex: 2,
  latestOffsetBars: 3,
  origin: 'manual',
  revision: 1,
  spanBars: 40,
  to: 5,
});

await registry.stop();

console.log('v6 chart viewport pane manual isolation smoke passed');
