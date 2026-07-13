import assert from 'node:assert/strict';
import { BAR_DATA_COMMANDS, REPLAY_COMMANDS } from '../src/contracts/app-contracts.js';
import { REPLAY_NAVIGATION_ACTIONS } from '../src/replay-navigation/replay-navigation-schedule.js';
import { resolveReplayNavigationTarget } from '../src/replay-navigation/replay-navigation-target-resolver.js';
import { resolveReplaySourceBarNearAnchor } from '../src/replay/replay-forward-source-cursor-resolver.js';

const replayState = {
  cursorTime: '2026-05-01T20:00:00.000Z',
  endTime: '2026-05-04T23:30:00.000Z',
  symbol: 'nq',
  timeframe: '1m',
};

{
  const calls = [];
  const resolved = await resolveReplayNavigationTarget({
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_DAY_OPEN,
    dispatchCommand: async (command, payload) => {
      calls.push({ command, payload });
      assert.equal(command, BAR_DATA_COMMANDS.LOAD_WINDOW);
      if (calls.length === 1) return { bars: [] };
      const timestamp = Date.parse(payload.anchor) / 1000 + 120;
      return { bars: [{ close: 200, timestamp }], key: `window-${calls.length}` };
    },
    maxCandidates: 3,
    pane: { instrument: 'es' },
    replayState,
  });

  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.attemptedCandidates, 2, 'empty first anchor advances to the next candidate');
  assert.equal(resolved.candidate.timestampIso, '2026-05-02T22:00:00.000Z');
  assert.equal(resolved.sourceCursorTime, '2026-05-02T22:02:00.000Z');
  assert.equal(resolved.distanceMs, 120_000);
  assert.deepEqual(calls.map((call) => call.payload.instrument), ['ES', 'ES']);
  assert.deepEqual(calls.map((call) => call.payload.count), [16, 16]);
  assert.equal(calls.some((call) => call.command === REPLAY_COMMANDS.SET_CURSOR_TIME), false);
}

{
  const tooLate = await resolveReplaySourceBarNearAnchor({
    anchorTimestamp: '2026-05-01T22:00:00.000Z',
    dispatchCommand: async () => ({
      bars: [{ timestamp: Date.parse('2026-05-01T22:16:00.000Z') / 1000 }],
    }),
    replayState,
  });
  assert.equal(tooLate, null, 'bars outside the candidate-adjacent window are rejected');
}

{
  const rejected = await resolveReplayNavigationTarget({
    action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
    dispatchCommand: async () => ({ bars: [] }),
    maxCandidates: 2,
    replayState,
  });
  assert.deepEqual(rejected, {
    action: REPLAY_NAVIGATION_ACTIONS.NEW_YORK_SESSION,
    attemptedCandidates: 2,
    reason: 'no-real-source-bar',
    status: 'rejected',
  });
}

{
  const calls = [];
  const rejected = await resolveReplayNavigationTarget({
    action: REPLAY_NAVIGATION_ACTIONS.NEXT_SESSION,
    dispatchCommand: async (...args) => calls.push(args),
    replayState: { ...replayState, cursorTime: replayState.endTime },
  });
  assert.equal(rejected.reason, 'no-forward-candidate');
  assert.equal(rejected.attemptedCandidates, 0);
  assert.deepEqual(calls, []);
}

console.log('V6 replay navigation target resolver Step 405 smoke passed.');
