import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PANE_INTENT_RELOAD_DATA_COMMANDS,
  PANE_INTENT_RELOAD_DATA_EVENTS,
  PANE_INTENT_RELOAD_PLAN_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createPaneIntentReloadDataRuntime } from '../src/pane-intent-reload/pane-intent-reload-data-runtime.js';
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

const requests = [];
const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    requests.push(window);
    return {
      bars: [
        { close: 100.5, high: 101, low: 99, open: 100, timestamp: 1780306200 },
        { close: 101.5, high: 102, low: 100, open: 100.5, timestamp: 1780306260 },
      ],
      requestedRange: { endTs: 1780306260, startTs: 1780306200 },
      timing: { durationMs: 4, parseMs: 1, requestMs: 3, source: 'test-fetch' },
    };
  },
}));
registry.registerRuntime(createPaneIntentReloadDataRuntime());

const loadedEvents = [];
const unsubscribeLoaded = subscribeEvent(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, (records) => {
  loadedEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE), true);

emitEvent(PANE_INTENT_RELOAD_PLAN_EVENTS.PLANNED, [{
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
  window: {
    anchor: '2026-06-01T09:31:00.000Z',
    bounded: true,
    direction: 'backward',
    end: '2026-06-01 09:31',
    estimatedBars: 2,
    instrument: 'NQ',
    requestCap: 'replay-cursor',
    start: '2026-06-01 09:30',
    timeframe: 1,
  },
}]);
await flushAsyncHandlers();

assert.equal(requests.length, 1);
assert.deepEqual(requests[0], {
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:31',
  estimatedBars: 2,
  instrument: 'NQ',
  requestCap: 'replay-cursor',
  start: '2026-06-01 09:30',
  timeframe: 1,
});
assert.equal(loadedEvents.length, 1);
assert.deepEqual(loadedEvents[0], [{
  displayTimeframe: undefined,
  loadedWindow: {
    barCount: 2,
    cacheHit: false,
    coveredByKey: null,
    history: null,
    key: 'NQ|1|2026-06-01 09:30|2026-06-01 09:31',
    requestedRange: { endTs: 1780306260, startTs: 1780306200 },
    timing: { durationMs: 4, parseMs: 1, requestMs: 3, source: 'test-fetch' },
  },
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  sessionStartTime: undefined,
  source: 'pane-intent',
  sourceTimeframe: undefined,
  window: {
    anchor: '2026-06-01T09:31:00.000Z',
    bounded: true,
    direction: 'backward',
    end: '2026-06-01 09:31',
    estimatedBars: 2,
    instrument: 'NQ',
    requestCap: 'replay-cursor',
    start: '2026-06-01 09:30',
    timeframe: 1,
  },
}]);
assert.deepEqual(await dispatchCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE), {
  lastError: null,
  lastLoaded: loadedEvents[0],
  loadedCount: 1,
  status: 'loaded',
});

emitEvent(PANE_INTENT_RELOAD_PLAN_EVENTS.PLANNED, [{
  noFuture: true,
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
  window: requests[0],
}]);
await flushAsyncHandlers();
assert.equal(requests.length, 1);
assert.equal(loadedEvents.length, 2);
assert.equal(loadedEvents[1][0].loadedWindow.cacheHit, true);

await registry.stop();
unsubscribeLoaded();
assert.equal(hasCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-data-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload data runtime must not contain ${token}`);
}
assert.equal(source.includes('BAR_DATA_COMMANDS.LOAD_WINDOW'), true);

console.log('v6 pane intent reload data runtime step 176 smoke passed');
