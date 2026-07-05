import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  DEFAULT_WALL_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createDefaultWallRuntime } from '../src/default-wall/default-wall-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const loadedEvents = [];
const advancedEvents = [];
const unsubscribeLoaded = subscribeEvent(DEFAULT_WALL_EVENTS.LOADED, (payload) => loadedEvents.push(payload));
const unsubscribeAdvanced = subscribeEvent(DEFAULT_WALL_EVENTS.ADVANCED, (payload) => advancedEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createDefaultWallRuntime());
await registry.start({ emitEvent, subscribeEvent });

const bars = Array.from({ length: 5 }, (_, index) => ({
  close: 100 + index + 0.5,
  high: 101 + index,
  low: 99 + index,
  open: 100 + index,
  timestamp: 1780306200 + (index * 60),
}));
const session = {
  endTime: '2026-06-01T09:34:00.000Z',
  id: 'session-default-wall',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
};

assert.equal(hasCommand(DEFAULT_WALL_COMMANDS.LOAD), true);

const loaded = await dispatchCommand(DEFAULT_WALL_COMMANDS.LOAD, {
  bars,
  latestOffsetBars: 4,
  paneId: 'pane-main',
  prefixBars: 0,
  session,
  spanBars: 120,
});

assert.equal(loaded.replayState.cursorIndex, 0);
assert.equal(loaded.state.chartBarCount, 1);
assert.equal(loaded.state.forwardBarCount, 4);
assert.equal(loaded.chartRecord.bars.length, 1);
assert.equal(loadedEvents.length, 1);

let replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(replayState.cursorTime, session.startTime);
let chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-main' });
assert.deepEqual(chartRecord.bars.map((bar) => bar.timestamp), [1780306200]);
let viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-main' });
assert.deepEqual(viewport.projection, {
  from: -116,
  latestLogicalIndex: 0,
  latestOffsetBars: 4,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 4,
});

const firstNext = await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
assert.equal(firstNext.replayState.cursorIndex, 1);
assert.equal(firstNext.state.chartBarCount, 2);
assert.equal(firstNext.state.latestBar.timestamp, 1780306260);
assert.equal(advancedEvents.length, 1);
chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'pane-main' });
assert.deepEqual(chartRecord.bars.map((bar) => bar.timestamp), [1780306200, 1780306260]);
viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-main' });
assert.deepEqual(viewport.projection, {
  from: -115,
  latestLogicalIndex: 1,
  latestOffsetBars: 4,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 5,
});

await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
const exhausted = await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
assert.equal(exhausted.state.forwardBarCount, 0);
assert.equal(exhausted.replayState.status, 'ended');
const noOp = await dispatchCommand(DEFAULT_WALL_COMMANDS.NEXT);
assert.equal(noOp.chartRecord, null);
assert.equal(noOp.state.chartBarCount, 5);

await registry.stop();
assert.equal(hasCommand(DEFAULT_WALL_COMMANDS.LOAD), false);
unsubscribeLoaded();
unsubscribeAdvanced();

console.log('v6 default wall runtime smoke passed');
