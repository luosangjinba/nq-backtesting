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
  id: 'replay-previous-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:32',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(initial.revealedCount, 0);

const startPrevious = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
  sessionId: created.session.id,
});
assert.equal(startPrevious.rewound, false);
assert.equal(startPrevious.reason, 'start-bar');
assert.equal(startPrevious.cursorTimestamp, initial.cursorTimestamp);
assert.equal(startPrevious.revealedCount, 0);

const firstNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(firstNext.advanced, true);
assert.equal(firstNext.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(firstNext.revealedCount, 1);
assert.equal(chartBars.length, initial.displayBars.length + 1);

const requestCountBeforePrevious = barRequests.length;
const previous = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS, {
  sessionId: created.session.id,
});
assert.equal(previous.rewound, true);
assert.equal(previous.cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(previous.revealedCount, 0);
assert.equal(previous.displayBars.length, initial.displayBars.length);
assert.equal(chartBars.length, initial.displayBars.length);
assert.equal(barRequests.length, requestCountBeforePrevious);

const record = await dispatchCommand(SESSION_COMMANDS.GET, {
  sessionId: created.session.id,
});
assert.equal(record.cursor.cursorTimestamp, '2026-06-01T09:30:00.000Z');
assert.equal(record.cursor.revealedCount, 0);

const nextAfterPrevious = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(nextAfterPrevious.advanced, true);
assert.equal(nextAfterPrevious.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(nextAfterPrevious.revealedCount, 1);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay previous smoke passed');
