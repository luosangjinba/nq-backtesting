import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, subscribeEvent } from '../src/runtime/events.js';
import { createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';
import { REPLAY_COMMANDS, createReplayRuntime } from '../src/runtime/replay-runtime.js';
import { SESSION_COMMANDS, createSessionRuntime } from '../src/runtime/session-runtime.js';
import { createSessionRepository } from '../src/session/session-repository.js';

clearCommandsForTest();
clearEventsForTest();

const barRequests = [];
const firstTimestamp = Date.parse('2026-06-01T09:30:00.000Z') / 1000;
const secondTimestamp = Date.parse('2026-06-01T09:31:00.000Z') / 1000;
const sessionRuntime = createSessionRuntime(createSessionRepository());
const barDataRuntime = createBarDataRuntime({
  fetchBars: async (window) => {
    barRequests.push(window);
    return {
      bars: [
        { timestamp: firstTimestamp, open: 100, high: 101, low: 99, close: 100.5 },
        { timestamp: secondTimestamp, open: 100.5, high: 102, low: 100, close: 101.5 },
      ],
    };
  },
});
const replayRuntime = createReplayRuntime();

let resolvedEvent = null;
sessionRuntime.start();
barDataRuntime.start();
const unsubscribe = subscribeEvent('replay:startBarResolved', (payload) => {
  resolvedEvent = payload;
});
replayRuntime.start({
  emitEvent: (name, payload) => {
    if (name === 'replay:startBarResolved') resolvedEvent = payload;
  },
});

assert.equal(hasCommand(REPLAY_COMMANDS.RESOLVE_START_BAR), true);
const created = await dispatchCommand(SESSION_COMMANDS.CREATE, {
  id: 'replay-start-bar-test',
  instrument: 'NQ',
  timeframe: 1,
  sessionStart: '2026-06-01T09:30:30.000Z',
  sessionEnd: '2026-06-01T10:00:00.000Z',
});

const state = await dispatchCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, {
  sessionId: created.session.id,
});
assert.equal(barRequests.length, 1);
assert.deepEqual(barRequests[0], {
  instrument: 'NQ',
  timeframe: 1,
  start: '2026-06-01 09:30',
  end: '2026-06-01 09:31',
  anchor: '2026-06-01T09:30:30.000Z',
  direction: 'forward',
  estimatedBars: 2,
  bounded: true,
});
assert.equal(state.sessionId, created.session.id);
assert.equal(state.status, 'start-resolved');
assert.equal(state.startBar.timestamp, secondTimestamp);
assert.equal(state.startBarTimestamp, '2026-06-01T09:31:00.000Z');
assert.equal(state.cursorTimestamp, state.startBarTimestamp);
assert.equal(resolvedEvent.startBar.timestamp, state.startBar.timestamp);

const stored = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.deepEqual(stored, state);

await assert.rejects(
  () => dispatchCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, { sessionId: 'missing' }),
  /was not found/
);

replayRuntime.stop();
barDataRuntime.stop();
sessionRuntime.stop();
unsubscribe();
assert.equal(hasCommand(REPLAY_COMMANDS.RESOLVE_START_BAR), false);

console.log('v5 replay start bar smoke passed');
