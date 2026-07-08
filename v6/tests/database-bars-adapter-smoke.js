import assert from 'node:assert/strict';
import { createDatabaseBarsAdapter, DATABASE_BAR_SCHEMA } from '../src/bar-data/database-bars-adapter.js';
import { planCanvasLeftOlderWindow } from '../src/bar-data/bar-window.js';

const olderWindow = planCanvasLeftOlderWindow({
  canvasLeftTimestamp: '2026-06-01T09:27:00.000Z',
  instrument: 'nq',
  oldestLoadedTimestamp: '2026-06-01T09:30:00.000Z',
  timeframe: 1,
}, { maxBarsPerWindow: 5 });

assert.deepEqual(olderWindow, {
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

assert.deepEqual(
  planCanvasLeftOlderWindow({
    canvasLeftTimestamp: '2026-06-01T09:31:00.000Z',
    instrument: 'NQ',
    oldestLoadedTimestamp: '2026-06-01T09:30:00.000Z',
    timeframe: 1,
  }),
  {
    bounded: true,
    exhausted: true,
    instrument: 'NQ',
    reason: 'canvas-left-inside-loaded-window',
    timeframe: 1,
  }
);

assert.deepEqual(
  planCanvasLeftOlderWindow({
    canvasLeftTimestamp: '2026-06-01T09:20:00.000Z',
    instrument: 'NQ',
    oldestLoadedTimestamp: '2026-06-01T09:30:00.000Z',
    timeframe: 1,
  }, { maxBarsPerWindow: 5 }),
  {
    bounded: true,
    canvasLeftBoundary: '2026-06-01 09:20',
    chunked: true,
    direction: 'backward',
    end: '2026-06-01 09:29',
    estimatedBars: 5,
    historyRequest: 'older-window',
    instrument: 'NQ',
    requestCap: 'canvas-left',
    start: '2026-06-01 09:25',
    timeframe: 1,
  }
);

const queryCalls = [];
const timingSamples = [125, 130, 132];
const fetchDatabaseBars = createDatabaseBarsAdapter({
  now: () => timingSamples.shift(),
  queryBars: async (request) => {
    queryCalls.push(request);
    assert.equal(request.schema.table, 'futures_1m');
    assert.equal(request.schema.columns.timestamp, 'ts');
    assert.equal(request.window.requestCap, 'canvas-left');
    assert.equal(request.window.start, '2026-06-01 09:27');
    assert.equal(request.window.end, '2026-06-01 09:29');
    return {
      exhaustedBefore: true,
      rows: [
        { ts: '2026-06-01 09:27', open: 97, high: 98, low: 96, close: 97.5, volume: 10 },
        { ts: '2026-06-01 09:28', open: 98, high: 99, low: 97, close: 98.5, volume: 11 },
      ],
    };
  },
});

const result = await fetchDatabaseBars(olderWindow);

assert.equal(queryCalls.length, 1);
assert.equal(DATABASE_BAR_SCHEMA.dbPath, 'v4/data/trading_data.duckdb');
assert.deepEqual(result.bars, [
  { time: '2026-06-01 09:27', open: 97, high: 98, low: 96, close: 97.5, volume: 10 },
  { time: '2026-06-01 09:28', open: 98, high: 99, low: 97, close: 98.5, volume: 11 },
]);
assert.deepEqual(result.requestedRange, {
  endTs: 1780306140,
  startTs: 1780306020,
});
assert.deepEqual(result.history, {
  canvasLeftBoundary: '2026-06-01 09:27',
  cappedAtCanvasLeft: true,
  direction: 'backward',
  exhaustedBefore: true,
  requestCap: 'canvas-left',
  startTs: 1780306020,
  endTs: 1780306140,
});
assert.deepEqual(result.timing, {
  durationMs: 7,
  normalizeMs: 2,
  queryMs: 5,
  source: 'database-bars-adapter',
});

console.log('v6 database bars adapter smoke passed');
