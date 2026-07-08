import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_EVENTS,
  PANE_INTENT_RELOAD_DATA_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createPaneIntentReloadChartDataRuntime } from '../src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js';
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

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async () => ({
    bars: [
      { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
      { close: 101.5, high: 102, low: 100, open: 100.5, timestamp: 1780306260 },
      { close: 102.5, high: 103, low: 101, open: 101.5, timestamp: 1780306320 },
    ],
  }),
}));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createPaneIntentReloadChartDataRuntime());

const replacedEvents = [];
const unsubscribeReplaced = subscribeEvent(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, (records) => {
  replacedEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE), true);

await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, window);
emitEvent(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, [{
  loadedWindow: {
    barCount: 3,
    cacheHit: false,
    key: 'NQ|1|2026-06-01 09:30|2026-06-01 09:31',
  },
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
  window,
}]);
await flushAsyncHandlers();

const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(chartRecord.bars.map((bar) => bar.timestamp), [1780306200, 1780306260]);
assert.equal(chartRecord.revision, 1);
assert.equal(replacedEvents.length, 1);
assert.equal(replacedEvents[0][0].barCount, 2);
assert.equal(replacedEvents[0][0].cursorTimestamp, 1780306260);
assert.equal(replacedEvents[0][0].paneId, 'main');
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE), {
  lastError: null,
  lastReplaced: replacedEvents[0],
  replacedCount: 1,
  status: 'replaced',
});

emitEvent(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, [{
  noFuture: true,
  paneId: 'secondary',
  reason: 'interval',
  source: 'pane-intent-sync',
  window: {
    ...window,
    end: '2026-06-02 09:31',
    start: '2026-06-02 09:30',
  },
}]);
await flushAsyncHandlers();
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE), {
  lastError: 'Pane intent reload chart-data replacement missing bar-data window for pane secondary.',
  lastReplaced: replacedEvents[0],
  replacedCount: 1,
  status: 'error',
});

await registry.stop();
unsubscribeReplaced();
assert.equal(hasCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload chart-data runtime must not contain ${token}`);
}
assert.equal(source.includes('CHART_DATA_COMMANDS.REPLACE_BARS'), true);
assert.equal(source.includes('BAR_DATA_COMMANDS.GET_WINDOW'), true);

console.log('v6 pane intent reload chart-data runtime step 177 smoke passed');
