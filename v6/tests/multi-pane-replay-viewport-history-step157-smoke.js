import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  CHART_HISTORY_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../src/chart-history/leftward-history-extension-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

function replayState(cursorIndex, status = 'playing') {
  return {
    cursorIndex,
    cursorTime: `2026-06-01T09:${String(30 + cursorIndex).padStart(2, '0')}:00.000Z`,
    revealedCount: cursorIndex + 1,
    sessionId: 'multi-pane-viewport-history',
    status,
    symbol: 'NQ',
    timeframe: '1m',
  };
}

function initialBars(offset = 0) {
  return [
    { close: 100.5 + offset, high: 101 + offset, low: 100 + offset, open: 100 + offset, timestamp: 1780306200 },
    { close: 101.5 + offset, high: 102 + offset, low: 101 + offset, open: 101 + offset, timestamp: 1780306260 },
    { close: 102.5 + offset, high: 103 + offset, low: 102 + offset, open: 102 + offset, timestamp: 1780306320 },
  ];
}

function projectionOf(record) {
  return { ...record.projection };
}

clearCommandsForTest();
clearEventsForTest();

const fetchCalls = [];
const windows = new Map([
  ['2026-06-01 09:27|2026-06-01 09:29', {
    bars: [
      { close: 97.5, high: 98, low: 97, open: 97, timestamp: 1780306020 },
      { close: 98.5, high: 99, low: 98, open: 98, timestamp: 1780306080 },
      { close: 99.5, high: 100, low: 99, open: 99, timestamp: 1780306140 },
    ],
    history: { exhaustedBefore: false },
  }],
]);
const fetchBars = async (window) => {
  fetchCalls.push({ ...window });
  if (window.historyRequest === 'older-window') {
    const record = windows.get(`${window.start}|${window.end}`);
    return {
      bars: (record?.bars || []).map((bar) => ({ ...bar })),
      history: record?.history ? { ...record.history } : { exhaustedBefore: true },
    };
  }
  const cursorTimestamp = Math.floor(new Date(window.end || window.anchor).valueOf() / 1000);
  return {
    bars: [
      { close: 100 + fetchCalls.length, high: 101 + fetchCalls.length, low: 99 + fetchCalls.length, open: 100 + fetchCalls.length, timestamp: cursorTimestamp },
    ],
    history: null,
  };
};

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({ fetchBars, maxBarsPerWindow: 10 }));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent, subscribeEvent });

let cursorIndex = 2;
registerCommand(REPLAY_COMMANDS.GET_STATE, () => replayState(cursorIndex));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  cursorIndex += 1;
  const state = replayState(cursorIndex);
  emitEvent(REPLAY_EVENTS.ADVANCED, state);
  return state;
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({
  period: '1m',
  sync: false,
}));

await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306320,
  latestOffsetBars: 8,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
  cursorTimestamp: 1780306320,
  latestOffsetBars: 12,
  paneId: 'pane-b',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(0),
  cursorTimestamp: 1780306320,
  paneId: 'pane-a',
});
await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
  bars: initialBars(100),
  cursorTimestamp: 1780306320,
  paneId: 'pane-b',
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
  latestOffsetBars: 5,
  paneId: 'pane-b',
  spanBars: 45,
});
await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
  chartBarsRevision: 1,
  latestLogicalIndex: 2,
  paneId: 'pane-b',
});

const beforeHistoryB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
const history = await dispatchCommand(CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
  instrument: 'NQ',
  paneId: 'pane-a',
  timeframe: '1m',
  visibleRange: { from: -3.2, to: 15 },
});
assert.equal(history.status, 'loaded');
assert.equal(history.extension.paneId, 'pane-a');
assert.equal(history.extension.prependedBarCount, 3);

const afterHistoryA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
const afterHistoryB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
assert.deepEqual(projectionOf(afterHistoryA), {
  from: -107,
  latestLogicalIndex: 5,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 13,
});
assert.deepEqual(projectionOf(afterHistoryB), projectionOf(beforeHistoryB));

const nextA = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'pane-a' });
assert.equal(nextA.status, 'advanced');
assert.equal(nextA.advanced.chartRecord.paneId, 'pane-a');

const afterNextA = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-a' });
const afterNextB = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'pane-b' });
assert.deepEqual(projectionOf(afterNextA), {
  from: -106,
  latestLogicalIndex: 6,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 120,
  to: 14,
});
assert.deepEqual(projectionOf(afterNextB), projectionOf(beforeHistoryB));
assert.equal(afterNextB.intent.origin, 'manual');
assert.equal(afterNextB.intent.latestOffsetBars, beforeHistoryB.intent.latestOffsetBars);
assert.equal(afterNextB.intent.spanBars, beforeHistoryB.intent.spanBars);
assert.equal(afterNextB.intent.revision, beforeHistoryB.intent.revision);
assert.deepEqual(fetchCalls.map((call) => call.historyRequest || call.direction), [
  'older-window',
  'backward',
]);

await registry.stop();

console.log('v6 multi-pane replay viewport history step 157 smoke passed');
