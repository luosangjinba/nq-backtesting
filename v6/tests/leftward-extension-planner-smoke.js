import assert from 'node:assert/strict';
import { planLeftwardSourceWindow } from '../src/chart-history/leftward-extension-planner.js';

const oneMinute = planLeftwardSourceWindow({
  bars: [{ timestamp: 1780306200 }],
  displayTimeframe: 1,
  instrument: 'nq',
  sourceTimeframe: '1m',
  visibleRange: { from: -3.2, to: 20 },
});

assert.equal(oneMinute.status, 'planned');
assert.equal(oneMinute.leftBoundaryIndex, -3);
assert.deepEqual(oneMinute.plannedWindow, {
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

const fifteenMinute = planLeftwardSourceWindow({
  bars: [{ timestamp: 1780306200 }],
  displayTimeframe: 15,
  instrument: 'NQ',
  sourceTimeframe: 1,
  visibleRange: { from: -0.2, to: 20 },
});

assert.equal(fifteenMinute.status, 'planned');
assert.equal(fifteenMinute.leftBoundaryIndex, -1);
assert.deepEqual(fifteenMinute.plannedWindow, {
  bounded: true,
  canvasLeftBoundary: '2026-06-01 09:15',
  chunked: false,
  direction: 'backward',
  end: '2026-06-01 09:29',
  estimatedBars: 15,
  historyRequest: 'older-window',
  instrument: 'NQ',
  requestCap: 'canvas-left',
  start: '2026-06-01 09:15',
  timeframe: 1,
});

const inside = planLeftwardSourceWindow({
  bars: [{ timestamp: 1780306200 }],
  displayTimeframe: 15,
  instrument: 'NQ',
  sourceTimeframe: 1,
  visibleRange: { from: 0, to: 20 },
});

assert.deepEqual(inside, {
  leftBoundaryIndex: 0,
  reason: 'canvas-left-inside-loaded-window',
  status: 'ignored',
});

assert.throws(
  () => planLeftwardSourceWindow({
    bars: [{ timestamp: 1780306200 }],
    displayTimeframe: 7,
    instrument: 'NQ',
    sourceTimeframe: 5,
    visibleRange: { from: -1, to: 20 },
  }),
  /multiple/
);

console.log('v6 leftward extension planner smoke passed');
