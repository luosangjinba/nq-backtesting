import assert from 'node:assert/strict';
import { createReplayChartSync } from '../src/runtime/replay-chart-sync.js';

const commands = {
  APPEND_BARS: 'chart.appendBars',
  GET_VIEWPORT_METRICS: 'chart.getViewportMetrics',
  REPLACE_BARS: 'chart.replaceBars',
  SET_DISPLAY_CONTEXT: 'chart.setDisplayContext',
  SET_RIGHT_EDGE_LIMIT: 'chart.setRightEdgeLimit',
  SET_VIEWPORT_FOLLOW: 'chart.setViewportFollow',
};

const calls = [];
const sync = createReplayChartSync({
  getState: () => ({
    session: { instrument: 'NQ' },
  }),
  hasCommand: (command) => Object.values(commands).includes(command),
  chartCommands: commands,
  dispatchCommand: async (command, payload = {}) => {
    calls.push({ command, payload });
    if (command === commands.GET_VIEWPORT_METRICS) {
      return { estimatedVisibleBars: 80 };
    }
    return { ok: true };
  },
});

const revealedBars = [
  {
    time: '2026-06-01T09:31:00.000Z',
    timestamp: 1780306260,
    open: 100,
    high: 101,
    low: 99,
    close: 100.5,
  },
];

const result = await sync.appendRevealedBarsToPanes({
  panes: [
    { id: 'primary', displayTimeframe: 1 },
    { id: 'secondary', displayTimeframe: 1 },
    { id: 'tertiary', displayTimeframe: 5 },
  ],
  revealedBars,
  cursorTimestamp: '2026-06-01T09:31:00.000Z',
  replayTimeframe: 1,
  displayTimeframeFallback: 1,
});

assert.deepEqual(result.appended, [
  { paneId: 'primary', displayTimeframe: 1, appendedCount: 1 },
  { paneId: 'secondary', displayTimeframe: 1, appendedCount: 1 },
]);
assert.deepEqual(result.projected, [
  { paneId: 'tertiary', displayTimeframe: 5 },
]);
assert.deepEqual(result.skipped, []);

const appendCalls = calls.filter((call) => call.command === commands.APPEND_BARS);
assert.equal(appendCalls.length, 2);
assert.equal(appendCalls[0].payload.paneId, 'primary');
assert.deepEqual(appendCalls[0].payload.bars, revealedBars);
assert.deepEqual(appendCalls[0].payload.viewportFollow, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:31:00.000Z',
});
assert.equal(appendCalls[0].payload.rightEdgeLimit, '2026-06-01T09:31:00.000Z');

assert.equal(appendCalls[1].payload.paneId, 'secondary');
assert.deepEqual(appendCalls[1].payload.bars, revealedBars);
assert.deepEqual(appendCalls[1].payload.viewportFollow, {
  enabled: true,
  cursorTimestamp: '2026-06-01T09:31:00.000Z',
});
assert.ok(
  !appendCalls.some((call) => call.payload.paneId === 'tertiary'),
  'different-timeframe panes must not receive replay timeframe bars'
);

console.log('v5 replay chart sync fanout smoke passed');
