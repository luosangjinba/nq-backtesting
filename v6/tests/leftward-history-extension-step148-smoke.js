import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_HISTORY_COMMANDS,
  CHART_HISTORY_EVENTS,
  CHART_VIEWPORT_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../src/chart-history/leftward-history-extension-runtime.js';
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

const loadedEvents = [];
const ignoredEvents = [];
const unsubscribeLoaded = subscribeEvent(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, (payload) => {
  loadedEvents.push(payload);
});
const unsubscribeIgnored = subscribeEvent(CHART_HISTORY_EVENTS.LEFT_EXTENSION_IGNORED, (payload) => {
  ignoredEvents.push(payload);
});

const fetchCalls = [];
const fetchBars = async (window) => {
  fetchCalls.push(window);
  if (window.start === '2026-06-01 09:27' && window.end === '2026-06-01 09:29') {
    return {
      bars: [
        { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
        { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
        { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
      ],
      history: { exhaustedBefore: false },
      requestedRange: { end: window.end, start: window.start },
    };
  }
  return {
    bars: [],
    history: { exhaustedBefore: true },
    requestedRange: { end: window.end, start: window.start },
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
await registry.start({ emitEvent, subscribeEvent });

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306320,
  latestOffsetBars: 8,
  paneId: 'main',
  spanBars: 40,
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: [
    { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
    { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
    { close: 102.5, high: 103, low: 102, open: 102, timestamp: 1780306320 },
  ],
  cursorTimestamp: 1780306320,
  paneId: 'main',
});

let state = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(state.status, 'loaded');
assert.equal(state.extension.prependedBarCount, 3);
assert.deepEqual(state.extension.plannedWindow, {
  bounded: true,
  canvasLeftBoundary: '2026-06-01 09:27',
  chunked: false,
  direction: 'backward',
  end: '2026-06-01 09:29',
  estimatedBars: 3,
  historyRequest: 'older-window',
  instrument: 'NQ',
  requestCap: 'canvas-left',
  start: '2026-06-01 09:27',
  timeframe: 1,
});
assert.equal(fetchCalls.length, 1);
assert.deepEqual(fetchCalls[0], {
  bounded: true,
  canvasLeftBoundary: '2026-06-01 09:27',
  direction: 'backward',
  end: '2026-06-01 09:29',
  estimatedBars: 3,
  historyRequest: 'older-window',
  instrument: 'NQ',
  requestCap: 'canvas-left',
  start: '2026-06-01 09:27',
  timeframe: 1,
});

const chart = await dispatchCommand(CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
assert.deepEqual(chart.bars.map((bar) => bar.timestamp), [
  1780306020,
  1780306080,
  1780306140,
  1780306200,
  1780306260,
  1780306320,
]);
assert.equal(chart.revision, 2);
const viewport = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
assert.equal(viewport.chartBarsRevision, 2);
assert.deepEqual(viewport.projection, {
  from: -27,
  latestLogicalIndex: 5,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 40,
  to: 13,
});
assert.equal(loadedEvents.length, 1);
assert.equal(ignoredEvents.length, 0);
assert.deepEqual(await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY), {
  barCount: 3,
  keys: ['NQ|1|2026-06-01 09:27|2026-06-01 09:29'],
  windowCount: 1,
});

state = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'main',
  timeframe: '1m',
  visibleRange: { from: 0, to: 20 },
});
assert.equal(state.status, 'ignored');
assert.equal(state.extension.reason, 'canvas-left-inside-loaded-window');
assert.equal(fetchCalls.length, 1);
assert.equal(ignoredEvents.length, 1);

await registry.stop();
unsubscribeLoaded();
unsubscribeIgnored();

console.log('v6 leftward history extension step 148 smoke passed');
