import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

function bar(value, open) {
  return {
    timestamp: timestamp(value),
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

clearCommandsForTest();
clearEventsForTest();

let chartBars = [];
const barRequests = [];
const repository = createSessionRepository();
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward') {
      if (window.anchor === '2026-06-01T09:30:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:30:00.000Z', 100),
            bar('2026-06-01T09:31:00.000Z', 101),
          ],
        };
      }
      if (window.anchor === '2026-06-01T09:31:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:31:00.000Z', 101),
            bar('2026-06-01T09:32:00.000Z', 102),
          ],
        };
      }
    }
    return {
      bars: [
        bar('2026-06-01T09:28:00.000Z', 98),
        bar('2026-06-01T09:29:00.000Z', 99),
        bar('2026-06-01T09:30:00.000Z', 100),
      ],
    };
  },
});
const sessionRuntime = createSessionRuntime(repository);
let replayRuntime = createReplayRuntime();

barDataRuntime.start();
sessionRuntime.start();
const unregisterMetrics = registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, () => ({
  width: 30,
  height: 420,
  estimatedVisibleBars: 3,
  mounted: true,
}));
const unregisterReplace = registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars } = {}) => {
  chartBars = bars;
  return { bars };
});
replayRuntime.start();

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-restore-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:32',
});
await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(chartBars.at(-1).timestamp, timestamp('2026-06-01T09:31:00.000Z'));

replayRuntime.stop();
chartBars = [];
replayRuntime = createReplayRuntime();
replayRuntime.start();

const restored = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(restored.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(restored.revealedCount, 1);
assert.equal(restored.displayBars.length, 4);
assert.deepEqual(
  restored.displayBars.map((item) => item.timestamp),
  [
    timestamp('2026-06-01T09:28:00.000Z'),
    timestamp('2026-06-01T09:29:00.000Z'),
    timestamp('2026-06-01T09:30:00.000Z'),
    timestamp('2026-06-01T09:31:00.000Z'),
  ]
);
assert.deepEqual(chartBars, restored.displayBars);
assert.equal(
  barRequests.some((request) => request.start === '2026-06-01 09:30' && request.end === '2026-06-01 09:32'),
  false
);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay restore smoke passed');
