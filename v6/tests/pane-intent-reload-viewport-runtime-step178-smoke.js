import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CHART_VIEWPORT_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_EVENTS,
  PANE_INTENT_RELOAD_VIEWPORT_COMMANDS,
  PANE_INTENT_RELOAD_VIEWPORT_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createPaneIntentReloadViewportRuntime } from '../src/pane-intent-reload/pane-intent-reload-viewport-runtime.js';
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

function flushAsyncHandlers() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createPaneIntentReloadViewportRuntime());

const projectedEvents = [];
const unsubscribeProjected = subscribeEvent(PANE_INTENT_RELOAD_VIEWPORT_EVENTS.PROJECTED, (records) => {
  projectedEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE), true);

const window = {
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:31',
  estimatedBars: 2,
  instrument: 'NQ',
  requestCap: 'replay-cursor',
  start: '2026-06-01 09:30',
  timeframe: 1,
};

emitEvent(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, [{
  barCount: 2,
  chartRecord: {
    bars: [
      { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
      { close: 101.5, high: 102, low: 100, open: 100.5, timestamp: 1780306260 },
    ],
    paneId: 'main',
    revision: 7,
  },
  cursorTimestamp: 1780306260,
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
  window,
}]);
await flushAsyncHandlers();

assert.equal(projectedEvents.length, 1);
assert.equal(projectedEvents[0][0].paneId, 'main');
assert.equal(projectedEvents[0][0].chartBarsRevision, 7);
assert.equal(projectedEvents[0][0].latestLogicalIndex, 1);
assert.deepEqual(projectedEvents[0][0].projected.projection, {
  from: -111,
  latestLogicalIndex: 1,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 9,
});
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE), {
  lastError: null,
  lastProjected: projectedEvents[0],
  projectedCount: 1,
  status: 'projected',
});
assert.equal(
  (await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' })).chartBarsRevision,
  7,
);

emitEvent(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, [{
  chartRecord: { bars: [], paneId: 'broken', revision: undefined },
  cursorTimestamp: undefined,
  paneId: 'broken',
  window,
}]);
await flushAsyncHandlers();
assert.equal((await dispatchCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE)).status, 'error');

await registry.stop();
unsubscribeProjected();
assert.equal(hasCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-viewport-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'CHART_DATA_COMMANDS',
  'BAR_DATA_COMMANDS',
  'REPLAY_COMMANDS',
  'REPLACE_BARS',
  'LOAD_WINDOW',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload viewport runtime must not contain ${token}`);
}
assert.equal(source.includes('CHART_VIEWPORT_COMMANDS.ENSURE_INTENT'), true);
assert.equal(source.includes('CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION'), true);

console.log('v6 pane intent reload viewport runtime step 178 smoke passed');
