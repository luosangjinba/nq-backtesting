import assert from 'node:assert/strict';
import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LAYOUT_PANE_BOOTSTRAP_COMMANDS,
  LAYOUT_PANE_BOOTSTRAP_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createLayoutPaneBootstrapRuntime } from '../src/layout/layout-pane-bootstrap-runtime.js';
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

const events = [];
subscribeEvent(LAYOUT_PANE_BOOTSTRAP_EVENTS.BOOTSTRAPPED, (payload) => {
  events.push(payload);
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createLayoutPaneBootstrapRuntime());
await registry.start({ emitEvent, subscribeEvent });

assert.equal(hasCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE), true);

await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
  endTime: '2026-06-01T16:30:00.000Z',
  id: 'session-layout-bootstrap',
  name: 'Layout bootstrap',
  startTime: '2026-06-01T16:00:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780329600 },
    { close: 101.5, high: 102, low: 100, open: 101, timestamp: 1780329660 },
  ],
  cursorTimestamp: 1780329600,
  paneId: 'main',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780329600,
  paneId: 'main',
});

const bootstrapped = await dispatchCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE, {
  visiblePaneIds: ['main', 'secondary', 'tertiary', 'secondary'],
});
assert.equal(bootstrapped.status, 'bootstrapped');
assert.equal(bootstrapped.error, null);
assert.deepEqual(bootstrapped.lastResult.bootstrapped, [
  { barCount: 1, paneId: 'secondary', revision: 1, viewportProjected: true },
  { barCount: 1, paneId: 'tertiary', revision: 1, viewportProjected: true },
]);
assert.deepEqual(bootstrapped.lastResult.skipped, [
  { paneId: 'main', reason: 'source-pane' },
]);
assert.equal(bootstrapped.lastResult.sourcePaneId, 'main');
assert.deepEqual(events.at(-1).bootstrapped.map((record) => record.paneId), ['secondary', 'tertiary']);

const secondaryBars = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'secondary' });
const tertiaryBars = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'tertiary' });
assert.deepEqual(secondaryBars.bars.map((bar) => bar.timestamp), [1780329600]);
assert.deepEqual(tertiaryBars.bars.map((bar) => bar.close), [100.5]);
secondaryBars.bars[0].close = 0;
assert.equal((await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' })).bars[0].close, 100.5);

const secondaryViewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'secondary' });
const tertiaryViewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'tertiary' });
assert.equal(Boolean(secondaryViewport.projection), true);
assert.equal(Boolean(tertiaryViewport.projection), true);

const secondRun = await dispatchCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE, {
  visiblePaneIds: ['main', 'secondary'],
});
assert.equal(secondRun.status, 'skipped');
assert.deepEqual(secondRun.lastResult.skipped, [
  { paneId: 'main', reason: 'source-pane' },
  { paneId: 'secondary', reason: 'already-has-bars' },
]);

const state = await dispatchCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
assert.equal(state.status, 'skipped');
assert.deepEqual(state.lastResult.visiblePaneIds, ['main', 'secondary']);

await registry.stop();
assert.equal(hasCommand(LAYOUT_PANE_BOOTSTRAP_COMMANDS.BOOTSTRAP_VISIBLE), false);

console.log('v6 layout pane bootstrap runtime smoke passed');
