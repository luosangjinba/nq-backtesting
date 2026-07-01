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
      if (window.anchor === '2026-06-01T09:32:00.000Z') {
        return {
          bars: [
            bar('2026-06-01T09:32:00.000Z', 102),
            bar('2026-06-01T09:33:00.000Z', 103),
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
  id: 'replay-truncate-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:35',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
assert.equal(initial.cursorTimestamp, '2026-06-01T09:30:00.000Z');

await dispatchCommand(REPLAY_COMMANDS.NEXT, { sessionId: created.session.id });
await dispatchCommand(REPLAY_COMMANDS.NEXT, { sessionId: created.session.id });
const afterTwoNext = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(afterTwoNext.cursorTimestamp, '2026-06-01T09:32:00.000Z');
assert.equal(afterTwoNext.revealedCount, 2);

const outOfRange = await dispatchCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, {
  sessionId: created.session.id,
  timestamp: '2026-06-01T09:33:00.000Z',
});
assert.equal(outOfRange.truncated, false);
assert.equal(outOfRange.reason, 'selected-bar-out-of-range');
assert.equal(outOfRange.cursorTimestamp, '2026-06-01T09:32:00.000Z');

const requestCountBeforeTruncate = barRequests.length;
const truncated = await dispatchCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, {
  sessionId: created.session.id,
  timestamp: '2026-06-01T09:31:00.000Z',
});
assert.equal(truncated.truncated, true);
assert.equal(truncated.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(truncated.revealedCount, 1);
assert.equal(truncated.displayBars.length, initial.displayBars.length + 1);
assert.equal(chartBars.length, initial.displayBars.length + 1);
assert.equal(barRequests.length, requestCountBeforeTruncate);
assert.equal(
  truncated.displayBars.some((item) => item.timestamp > timestamp('2026-06-01T09:31:00.000Z')),
  false
);

const record = await dispatchCommand(SESSION_COMMANDS.GET, {
  sessionId: created.session.id,
});
assert.equal(record.cursor.cursorTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(record.cursor.revealedCount, 1);

const nextAfterTruncate = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
  sessionId: created.session.id,
});
assert.equal(nextAfterTruncate.advanced, true);
assert.equal(nextAfterTruncate.cursorTimestamp, '2026-06-01T09:32:00.000Z');
assert.equal(nextAfterTruncate.revealedCount, 2);

replayRuntime.stop();
unregisterReplace();
unregisterMetrics();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 replay truncate smoke passed');
