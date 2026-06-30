import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent, subscribeEvent } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import { createDisplayTimezoneRuntime, DISPLAY_TIMEZONE_COMMANDS, DISPLAY_TIMEZONE_EVENTS } from '../src/runtime/display-timezone-runtime.js';
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
const timezoneEvents = [];
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    if (window.direction === 'forward') {
      return {
        bars: [
          bar('2026-06-01T09:30:00.000Z', 100),
          bar('2026-06-01T09:31:00.000Z', 101),
        ],
      };
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
const timezoneRuntime = createDisplayTimezoneRuntime();

barDataRuntime.start();
sessionRuntime.start();
timezoneRuntime.start({ emitEvent });
const unsubscribeTimezone = subscribeEvent(DISPLAY_TIMEZONE_EVENTS.CHANGED, (payload) => {
  timezoneEvents.push(payload);
});
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
const unregisterRightEdge = registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, ({ rightEdge } = {}) => ({ rightEdge }));
const unregisterDisplayContext = registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload = {}) => ({
  displayContext: payload,
}));
replayRuntime.start();

assert.deepEqual(await dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.GET), {
  displayTimezone: 'Exchange',
  exchangeTimezone: 'America/New_York',
  resolvedTimezone: 'America/New_York',
});

const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'display-timezone-runtime-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01 09:30',
  sessionEnd: '2026-06-01 09:40',
});
const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
  sessionId: created.session.id,
});
const requestCountBeforeTimezone = barRequests.length;
const chartBarsBeforeTimezone = structuredClone(chartBars);
const displayBarsBeforeTimezone = structuredClone(initial.displayBars);

const updated = await dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.SET, {
  displayTimezone: 'UTC',
});
assert.deepEqual(updated, {
  displayTimezone: 'UTC',
  exchangeTimezone: 'America/New_York',
  resolvedTimezone: 'UTC',
});
assert.equal(timezoneEvents.length, 1);
assert.equal(barRequests.length, requestCountBeforeTimezone);
assert.deepEqual(chartBars, chartBarsBeforeTimezone);
assert.deepEqual((await dispatchCommand(REPLAY_COMMANDS.GET_STATE)).displayBars, displayBarsBeforeTimezone);

const unchanged = await dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.SET, {
  displayTimezone: 'UTC',
});
assert.equal(unchanged.displayTimezone, 'UTC');
assert.equal(timezoneEvents.length, 1);
await assert.rejects(
  () => dispatchCommand(DISPLAY_TIMEZONE_COMMANDS.SET, { displayTimezone: 'Not/AZone' }),
  /Unsupported display timezone/
);

replayRuntime.stop();
unregisterDisplayContext();
unregisterRightEdge();
unregisterReplace();
unregisterMetrics();
unsubscribeTimezone();
timezoneRuntime.stop();
sessionRuntime.stop();
barDataRuntime.stop();

console.log('v5 display timezone runtime smoke passed');
