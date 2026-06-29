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
const sessionRuntime = createSessionRuntime(createSessionRepository());
const replayRuntime = createReplayRuntime();

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
  id: 'replay-next-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:31',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.displayBars.length, 3);

const firstNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(firstNext.advanced, true);
assert.equal(firstNext.revealedBar.timestamp, timestamp('2026-06-01T09:31:00.000Z'));
assert.equal(firstNext.displayBars.length, initial.displayBars.length + 1);
assert.equal(firstNext.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(chartBars.length, firstNext.displayBars.length);
assert.deepEqual(
  firstNext.displayBars.slice(initial.displayBars.length).map((item) => item.timestamp),
  [timestamp('2026-06-01T09:31:00.000Z')]
);

const secondNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(secondNext.advanced, false);
assert.equal(secondNext.reason, 'session-end');
assert.equal(secondNext.displayBars.length, firstNext.displayBars.length);
assert.equal(chartBars.length, firstNext.displayBars.length);
assert.equal(barRequests.length, 3);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay next smoke passed');
