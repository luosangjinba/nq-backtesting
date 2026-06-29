import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { CHART_COMMANDS } from '../src/runtime/chart-runtime.js';
import {
  REPLAY_COMMANDS,
  canRevealBar,
  createReplayRuntime,
  isAtOrAfterSessionEnd,
} from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

function timestamp(value) {
  return Date.parse(value) / 1000;
}

function iso(timestampSecondsValue) {
  return new Date(timestampSecondsValue * 1000).toISOString();
}

function barFromTimestamp(timestampSecondsValue, open) {
  return {
    timestamp: timestampSecondsValue,
    open,
    high: open + 1,
    low: open - 1,
    close: open + 0.5,
  };
}

function makeBars(startTimestamp, timeframe, count, firstOpen = 100) {
  return Array.from({ length: count }, (_, index) =>
    barFromTimestamp(startTimestamp + (index * timeframe * 60), firstOpen + index)
  );
}

async function runScenario({
  id,
  timeframe,
  sessionEnd,
  expectedAdvance,
}) {
  clearCommandsForTest();
  clearEventsForTest();

  const startTimestamp = timestamp('2026-06-01T09:30:00.000Z');
  const forwardBars = makeBars(startTimestamp, timeframe, 3);
  const requests = [];
  let chartBars = [];

  const barDataRuntime = createBarDataRuntime({
    fetchBars: async (window) => {
      requests.push(window);
      if (window.direction === 'forward') {
        return { bars: forwardBars };
      }
      return { bars: makeBars(startTimestamp - (2 * timeframe * 60), timeframe, 3, 90) };
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
    id,
    instrument: 'NQ',
    timeframe,
    sessionStart: '2026-06-01 09:30',
    sessionEnd,
  });
  const initial = await dispatchCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, {
    sessionId: created.session.id,
  });
  const firstNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
    sessionId: created.session.id,
  });

  assert.equal(firstNext.advanced, expectedAdvance, `${id} first next advanced`);
  if (expectedAdvance) {
    assert.equal(firstNext.revealedBar.timestamp, forwardBars[1].timestamp);
    assert.equal(firstNext.displayBars.length, initial.displayBars.length + 1);
    assert.equal(chartBars.length, firstNext.displayBars.length);
  } else {
    assert.equal(firstNext.reason, 'session-end');
    assert.equal(firstNext.displayBars.length, initial.displayBars.length);
    assert.equal(chartBars.length, initial.displayBars.length);
  }

  const requestsBeforeEndCheck = requests.length;
  const secondNext = await dispatchCommand(REPLAY_COMMANDS.NEXT, {
    sessionId: created.session.id,
  });
  assert.equal(secondNext.advanced, false);
  assert.equal(secondNext.reason, 'session-end');
  assert.equal(requests.length, requestsBeforeEndCheck);

  replayRuntime.stop();
  unregisterReplace();
  unregisterMetrics();
  sessionRuntime.stop();
  barDataRuntime.stop();
}

assert.equal(
  isAtOrAfterSessionEnd('2026-06-01T09:31:00.000Z', '2026-06-01 09:31'),
  true
);
assert.equal(
  isAtOrAfterSessionEnd('2026-06-01T09:30:00.000Z', '2026-06-01 09:31'),
  false
);
assert.equal(canRevealBar({ timestamp: timestamp('2026-06-01T09:31:00.000Z') }, '2026-06-01 09:31'), true);
assert.equal(canRevealBar({ timestamp: timestamp('2026-06-01T09:32:00.000Z') }, '2026-06-01 09:31'), false);

await runScenario({
  id: 'replay-session-end-1m-equal',
  timeframe: 1,
  sessionEnd: '2026-06-01 09:31',
  expectedAdvance: true,
});
await runScenario({
  id: 'replay-session-end-5m-equal',
  timeframe: 5,
  sessionEnd: '2026-06-01 09:35',
  expectedAdvance: true,
});
await runScenario({
  id: 'replay-session-end-1h-equal',
  timeframe: 60,
  sessionEnd: '2026-06-01 10:30',
  expectedAdvance: true,
});
await runScenario({
  id: 'replay-session-end-before-next',
  timeframe: 5,
  sessionEnd: iso(timestamp('2026-06-01T09:32:00.000Z')).slice(0, 16).replace('T', ' '),
  expectedAdvance: false,
});

console.log('v5 replay session end smoke passed');
