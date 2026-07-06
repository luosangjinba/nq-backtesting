import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

async function runManualNextBoundary({
  initialReplayState,
  nextStates = [],
  period = '5m',
}) {
  clearCommandsForTest();
  clearEventsForTest();
  const calls = [];
  const registry = createRuntimeRegistry();
  registry.registerRuntime(createChartEntryManualNextRuntime());
  await registry.start({ emitEvent });

  registerCommand(REPLAY_COMMANDS.GET_STATE, () => {
    calls.push(REPLAY_COMMANDS.GET_STATE);
    return initialReplayState;
  });
  registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => {
    calls.push(PLAYBACK_PERIOD_COMMANDS.GET_STATE);
    return { period, sync: false };
  });
  registerCommand(REPLAY_COMMANDS.NEXT, () => {
    calls.push(REPLAY_COMMANDS.NEXT);
    return nextStates.shift();
  });
  registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
    calls.push(BAR_DATA_COMMANDS.LOAD_WINDOW);
    return {
      bars: [
        {
          close: 100,
          high: 101,
          low: 99,
          open: 100,
          timestamp: Math.floor(new Date(payload.anchor).valueOf() / 1000),
        },
      ],
      cacheHit: true,
      key: payload.anchor,
    };
  });
  registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload) => {
    calls.push(CHART_DATA_COMMANDS.APPEND_BARS);
    return {
      bars: payload.bars,
      cursorTimestamp: payload.cursorTimestamp,
      paneId: payload.paneId,
      revision: calls.filter((call) => call === CHART_DATA_COMMANDS.APPEND_BARS).length,
    };
  });

  const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
  await registry.stop();
  return { calls, state };
}

const nearEnd = await runManualNextBoundary({
  initialReplayState: {
    cursorIndex: 3,
    cursorTime: '2026-06-01T09:33:00.000Z',
    revealedCount: 4,
    sessionId: 'session-boundary',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 5,
  },
  nextStates: [
    {
      cursorIndex: 4,
      cursorTime: '2026-06-01T09:34:00.000Z',
      revealedCount: 5,
      sessionId: 'session-boundary',
      status: 'ended',
      symbol: 'NQ',
      timeframe: '1m',
      totalBars: 5,
    },
  ],
});

assert.equal(nearEnd.state.status, 'advanced');
assert.equal(nearEnd.state.advanced.playbackPeriod, '5m');
assert.equal(nearEnd.state.advanced.stepCount, 5);
assert.equal(nearEnd.state.advanced.appendedBarCount, 1);
assert.equal(nearEnd.state.advanced.replayState.status, 'ended');
assert.equal(nearEnd.calls.filter((call) => call === REPLAY_COMMANDS.NEXT).length, 1);
assert.equal(nearEnd.calls.filter((call) => call === CHART_DATA_COMMANDS.APPEND_BARS).length, 1);

const alreadyEnded = await runManualNextBoundary({
  initialReplayState: {
    cursorIndex: 4,
    cursorTime: '2026-06-01T09:34:00.000Z',
    revealedCount: 5,
    sessionId: 'session-boundary',
    status: 'ended',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 5,
  },
});

assert.equal(alreadyEnded.state.status, 'ended');
assert.equal(alreadyEnded.state.advanced.playbackPeriod, '5m');
assert.equal(alreadyEnded.state.advanced.stepCount, 5);
assert.equal(alreadyEnded.state.advanced.appendedBarCount, 0);
assert.equal(alreadyEnded.state.advanced.chartRecord, null);
assert.equal(alreadyEnded.calls.includes(REPLAY_COMMANDS.NEXT), false);
assert.equal(alreadyEnded.calls.includes(BAR_DATA_COMMANDS.LOAD_WINDOW), false);
assert.equal(alreadyEnded.calls.includes(CHART_DATA_COMMANDS.APPEND_BARS), false);

console.log('v6 chart entry playback period boundary runtime smoke passed');
