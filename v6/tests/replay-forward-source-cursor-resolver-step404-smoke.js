import assert from 'node:assert/strict';
import { BAR_DATA_COMMANDS, REPLAY_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  advanceReplayToNextSourceBar,
  resolveNextReplaySourceBar,
} from '../src/replay/replay-forward-source-cursor-resolver.js';

const replayState = {
  cursorTime: '2025-01-03T16:00:00.000Z',
  endTime: '2025-01-06T16:00:00.000Z',
  symbol: 'nq',
  timeframe: 1,
};

{
  const calls = [];
  const advanced = await advanceReplayToNextSourceBar({
    dispatchCommand: async (command, payload) => {
      calls.push({ command, payload });
      return { ...replayState, cursorTime: '2025-01-03T16:01:00.000Z' };
    },
    hasCommand: () => false,
    replayState,
  });
  assert.equal(advanced.cursorTime, '2025-01-03T16:01:00.000Z');
  assert.deepEqual(calls, [{ command: REPLAY_COMMANDS.NEXT, payload: undefined }]);
}

{
  const calls = [];
  const dispatchCommand = async (command, payload) => {
    calls.push({ command, payload });
    if (command === BAR_DATA_COMMANDS.LOAD_WINDOW) {
      return calls.filter((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW).length === 1
        ? { bars: [] }
        : { bars: [{ timestamp: Date.parse('2025-01-06T12:00:00.000Z') / 1000, close: 200 }] };
    }
    return { ...replayState, cursorTime: payload.cursorTime };
  };
  const advanced = await advanceReplayToNextSourceBar({
    dispatchCommand,
    gapScanWindowBars: 60,
    hasCommand: (command) => command === REPLAY_COMMANDS.SET_CURSOR_TIME,
    pane: { instrument: 'es' },
    replayState,
  });
  const loadCalls = calls.filter((call) => call.command === BAR_DATA_COMMANDS.LOAD_WINDOW);
  assert.equal(loadCalls.length, 2);
  assert.deepEqual(loadCalls[0].payload, {
    anchor: '2025-01-03T16:01:00.000Z',
    count: 60,
    direction: 'forward',
    instrument: 'ES',
    timeframe: 1,
  });
  assert.equal(calls.at(-1).command, REPLAY_COMMANDS.SET_CURSOR_TIME);
  assert.equal(advanced.cursorTime, '2025-01-06T12:00:00.000Z');
}

{
  const calls = [];
  const endedState = { ...replayState, cursorTime: replayState.endTime };
  const advanced = await advanceReplayToNextSourceBar({
    dispatchCommand: async (...args) => calls.push(args),
    hasCommand: () => true,
    replayState: endedState,
  });
  assert.equal(advanced, endedState);
  assert.deepEqual(calls, []);
}

{
  const calls = [];
  const resolved = await resolveNextReplaySourceBar({
    dispatchCommand: async (command, payload) => {
      calls.push({ command, payload });
      return { bars: [] };
    },
    gapScanLimit: 1,
    replayState,
  });
  assert.equal(resolved, null);
  assert.equal(calls.length, 1);
}

console.log('V6 replay forward source cursor resolver Step 404 smoke passed.');
