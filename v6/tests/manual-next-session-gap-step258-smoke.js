import assert from 'node:assert/strict';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PANE_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const calls = [];
const registry = createRuntimeRegistry();
registry.registerRuntime(createChartEntryManualNextRuntime());
await registry.start({ emitEvent });

let replayState = {
  cursorIndex: 85,
  cursorTime: '2026-06-01T16:59:00.000Z',
  endTime: '2026-06-05T16:00:00.000Z',
  previousAvailable: true,
  revealedCount: 86,
  sessionId: 'session-gap',
  startTime: '2026-06-01T15:34:00.000Z',
  status: 'ready',
  symbol: 'NQ',
  timeframe: '1m',
  totalBars: 5787,
};

function bar(iso, price) {
  return {
    close: price + 0.25,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp: Math.floor(Date.parse(iso) / 1000),
  };
}

registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({ ...replayState }));
registerCommand(REPLAY_COMMANDS.NEXT, () => {
  replayState = {
    ...replayState,
    cursorIndex: replayState.cursorIndex + 1,
    cursorTime: '2026-06-01T17:00:00.000Z',
    revealedCount: replayState.revealedCount + 1,
  };
  calls.push({ command: REPLAY_COMMANDS.NEXT });
  return { ...replayState };
});
registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, ({ cursorTime }) => {
  replayState = {
    ...replayState,
    cursorTime,
  };
  calls.push({ command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime });
  return { ...replayState };
});
registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));
registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
  active: true,
  displayTimeframe: 1,
  id: paneId,
  instrument: 'NQ',
  timeframe: '1m',
}));
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
  calls.push({ command: BAR_DATA_COMMANDS.LOAD_WINDOW, payload });
  if (payload.direction === 'forward') {
    return {
      bars: [
        bar('2026-06-01T18:00:00.000Z', 30600),
        bar('2026-06-01T18:01:00.000Z', 30602),
      ],
      cacheHit: false,
      key: 'NQ|1|forward-gap',
    };
  }
  if (payload.anchor === '2026-06-01T17:00:00.000Z') {
    return {
      bars: [bar('2026-06-01T16:59:00.000Z', 30596)],
      cacheHit: false,
      key: 'NQ|1|gap-probe',
    };
  }
  return {
    bars: [
      bar('2026-06-01T17:59:00.000Z', 30598),
      bar('2026-06-01T18:00:00.000Z', 30600),
    ],
    cacheHit: false,
    key: 'NQ|1|after-gap',
  };
});
registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload) => {
  calls.push({ command: CHART_DATA_COMMANDS.APPEND_BARS, payload });
  return {
    bars: payload.bars.map((item) => ({ ...item })),
    cursorTimestamp: payload.cursorTimestamp,
    paneId: payload.paneId,
    revision: 2,
  };
});

const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });

assert.equal(state.status, 'advanced', state.error || 'manual next should cross the session gap');
assert.equal(state.advanced.replayState.cursorTime, '2026-06-01T18:00:00.000Z');
assert.equal(state.advanced.appendedBarCount, 1);
assert.equal(state.advanced.chartRecord.cursorTimestamp, Math.floor(Date.parse('2026-06-01T18:00:00.000Z') / 1000));
assert.deepEqual(
  calls
    .filter((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW)
    .map((call) => ({
      anchor: call.payload.anchor,
      direction: call.payload.direction,
    })),
  [
    { anchor: '2026-06-01T17:00:00.000Z', direction: 'backward' },
    { anchor: '2026-06-01T17:01:00.000Z', direction: 'forward' },
    { anchor: '2026-06-01T18:00:00.000Z', direction: 'backward' },
  ],
);
assert.deepEqual(
  calls.filter((call) => call.command === REPLAY_COMMANDS.SET_CURSOR_TIME),
  [{ command: REPLAY_COMMANDS.SET_CURSOR_TIME, cursorTime: '2026-06-01T18:00:00.000Z' }],
);

await registry.stop();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 manual next session gap step 258 smoke passed');
