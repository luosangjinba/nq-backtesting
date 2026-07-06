import assert from 'node:assert/strict';
import {
  CHART_DATA_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  CHART_VIEWPORT_EVENTS,
  REPLAY_EVENTS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const intentEvents = [];
const projectedEvents = [];
const unsubscribeIntent = subscribeEvent(CHART_VIEWPORT_EVENTS.INTENT_CHANGED, (payload) => {
  intentEvents.push(payload);
});
const unsubscribeProjected = subscribeEvent(CHART_VIEWPORT_EVENTS.PROJECTED, (payload) => {
  projectedEvents.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartViewportRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT), true);

const ensured = await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  paneId: 'pane-default',
});
assert.equal(ensured.intent.origin, 'default');
assert.equal(ensured.intent.revision, 0);
assert.equal(intentEvents.length, 1);

emitEvent(CHART_DATA_EVENTS.BARS_CHANGED, {
  operation: 'replace',
  record: {
    bars: [
      { timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
      { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
      { timestamp: 300, open: 3, high: 4, low: 2.5, close: 3.5 },
    ],
    paneId: 'pane-default',
    revision: 1,
  },
});
let record = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
  paneId: 'pane-default',
});
assert.equal(record.chartBarsRevision, 1);
assert.equal(record.intent.origin, 'default');
assert.equal(record.intent.revision, 0);
assert.deepEqual(record.projection, {
  from: -110,
  latestLogicalIndex: 2,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 10,
});
assert.equal(projectedEvents.length, 1);

const manual = await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 4,
  paneId: 'pane-default',
  spanBars: 60,
});
assert.equal(manual.intent.origin, 'manual');
assert.equal(manual.intent.revision, 1);

emitEvent(REPLAY_EVENTS.ADVANCED, {
  cursorTime: '2026-06-01T09:31:00.000Z',
});
record = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
  paneId: 'pane-default',
});
assert.equal(record.intent.cursorTimestamp, 1780306260);
assert.equal(record.intent.origin, 'manual');
assert.equal(record.intent.revision, 1);
assert.equal(record.intent.latestOffsetBars, 4);
assert.equal(record.intent.spanBars, 60);

emitEvent(CHART_DATA_EVENTS.BARS_CHANGED, {
  operation: 'append',
  record: {
    bars: [
      { timestamp: 100, open: 1, high: 2, low: 0.5, close: 1.5 },
      { timestamp: 200, open: 2, high: 3, low: 1.5, close: 2.5 },
      { timestamp: 300, open: 3, high: 4, low: 2.5, close: 3.5 },
      { timestamp: 400, open: 4, high: 5, low: 3.5, close: 4.5 },
    ],
    paneId: 'pane-default',
    revision: 2,
  },
});
record = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
  paneId: 'pane-default',
});
assert.equal(record.chartBarsRevision, 2);
assert.equal(record.intent.origin, 'manual');
assert.equal(record.intent.revision, 1);
assert.deepEqual(record.projection, {
  from: -53,
  latestLogicalIndex: 3,
  latestOffsetBars: 4,
  origin: 'manual',
  revision: 1,
  spanBars: 60,
  to: 7,
});

const reset = await dispatchCommand(CHART_VIEWPORT_COMMANDS.RESET_VIEW, {
  chartBarsRevision: 3,
  latestLogicalIndex: 3,
  paneId: 'pane-default',
});
assert.equal(reset.chartBarsRevision, 3);
assert.equal(reset.intent.cursorTimestamp, 1780306260);
assert.equal(reset.intent.origin, 'default');
assert.equal(reset.intent.revision, 2);
assert.equal(reset.intent.latestOffsetBars, 8);
assert.equal(reset.intent.spanBars, null);
assert.deepEqual(reset.projection, {
  from: -109,
  latestLogicalIndex: 3,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 2,
  spanBars: 120,
  to: 11,
});
assert.equal(intentEvents.at(-1).intent.origin, 'default');
assert.equal(projectedEvents.at(-1).projection.origin, 'default');

assert.equal((await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT)).panes.length, 1);
assert.equal(listenerCount(CHART_DATA_EVENTS.BARS_CHANGED), 1);
assert.equal(listenerCount(REPLAY_EVENTS.ADVANCED), 1);

await registry.stop();
assert.equal(hasCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT), false);
assert.equal(listenerCount(CHART_DATA_EVENTS.BARS_CHANGED), 0);
assert.equal(listenerCount(REPLAY_EVENTS.ADVANCED), 0);
unsubscribeIntent();
unsubscribeProjected();
assert.equal(listenerCount(CHART_VIEWPORT_EVENTS.INTENT_CHANGED), 0);

console.log('v6 chart viewport runtime smoke passed');
