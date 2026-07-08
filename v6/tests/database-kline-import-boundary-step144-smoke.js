import assert from 'node:assert/strict';
import { BAR_DATA_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createDatabaseBarsAdapter } from '../src/bar-data/database-bars-adapter.js';
import { planCanvasLeftOlderWindow } from '../src/bar-data/bar-window.js';
import { createChartEntryContextPlan } from '../src/chart-entry/chart-entry-context-plan.js';

clearCommandsForTest();
clearEventsForTest();

const timingSamples = [200, 207, 209];
const queryCalls = [];
const fetchBars = createDatabaseBarsAdapter({
  now: () => timingSamples.shift(),
  queryBars: async (request) => {
    queryCalls.push(request);
    assert.equal(request.schema.dbPath, 'v4/data/trading_data.duckdb');
    assert.equal(request.schema.table, 'futures_1m');
    assert.deepEqual(request.schema.columns, {
      close: 'close',
      high: 'high',
      instrument: 'instrument',
      low: 'low',
      open: 'open',
      timestamp: 'ts',
      volume: 'volume',
    });
    assert.equal(request.window.start, '2026-06-01 09:27');
    assert.equal(request.window.end, '2026-06-01 09:29');
    assert.equal(request.window.canvasLeftBoundary, '2026-06-01 09:27');
    assert.equal(request.window.requestCap, 'canvas-left');
    return {
      exhaustedBefore: true,
      rows: [
        { ts: '2026-06-01 09:29', open: 99, high: 100, low: 98, close: 99.5, volume: 13 },
        { ts: '2026-06-01 09:27', open: 97, high: 98, low: 96, close: 97.5, volume: 11 },
        { ts: '2026-06-01 09:28', open: 98, high: 99, low: 97, close: 98.5, volume: 12 },
      ],
    };
  },
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createBarDataRuntime({
  fetchBars,
  maxBarsPerWindow: 500,
}));
await registry.start({ emitEvent });

const olderWindow = planCanvasLeftOlderWindow({
  canvasLeftTimestamp: '2026-06-01T09:27:00.000Z',
  instrument: 'NQ',
  oldestLoadedTimestamp: '2026-06-01T09:30:00.000Z',
  timeframe: 1,
});
const loaded = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, olderWindow);

assert.equal(queryCalls.length, 1);
assert.equal(loaded.cacheHit, false);
assert.deepEqual(loaded.bars.map((bar) => bar.timestamp), [1780306020, 1780306080, 1780306140]);
assert.deepEqual(loaded.history, {
  canvasLeftBoundary: '2026-06-01 09:27',
  cappedAtCanvasLeft: true,
  direction: 'backward',
  exhaustedBefore: true,
  requestCap: 'canvas-left',
  startTs: 1780306020,
  endTs: 1780306140,
});
assert.deepEqual(loaded.requestedRange, {
  endTs: 1780306140,
  startTs: 1780306020,
});
assert.deepEqual(loaded.timing, {
  durationMs: 9,
  normalizeMs: 2,
  queryMs: 7,
  source: 'database-bars-adapter',
});

const cached = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, olderWindow);
assert.equal(queryCalls.length, 1);
assert.equal(cached.cacheHit, true);
assert.equal(cached.history.exhaustedBefore, true);

const contextPlan = createChartEntryContextPlan({
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'session-step144',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
}, { prefixBars: 10 });

assert.deepEqual(contextPlan.boundedContextWindow, {
  anchor: '2026-06-01T09:30:00.000Z',
  count: 11,
  direction: 'backward',
  instrument: 'NQ',
  timeframe: 1,
});
assert.equal(JSON.stringify(contextPlan.boundedContextWindow).includes('2026-06-05'), false);

const plannedContextWindow = await dispatchCommand(
  BAR_DATA_COMMANDS.PLAN_WINDOW,
  contextPlan.boundedContextWindow
);
assert.deepEqual(plannedContextWindow, {
  anchor: '2026-06-01T09:30:00.000Z',
  bounded: true,
  direction: 'backward',
  end: '2026-06-01 09:30',
  estimatedBars: 11,
  instrument: 'NQ',
  start: '2026-06-01 09:20',
  timeframe: 1,
});

await registry.stop();

console.log('v6 database k-line import boundary step 144 smoke passed');
