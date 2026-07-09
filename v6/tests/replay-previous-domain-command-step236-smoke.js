import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../src/contracts/app-contracts.js';
import {
  createReplayStateFromSession,
  nextReplayState,
  previousReplayState,
} from '../src/replay/replay-domain.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

async function read(path) {
  return readFile(path, 'utf8');
}

const session = {
  endTime: '2026-06-01T09:45:00.000Z',
  id: 'session-step-236',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '5m',
};

const initial = createReplayStateFromSession(session);
const second = nextReplayState(initial);
const third = nextReplayState(second);
const previous = previousReplayState(third);

assert.equal(previous.cursorIndex, 1);
assert.equal(previous.cursorTime, '2026-06-01T09:35:00.000Z');
assert.equal(previous.revealedCount, 2);
assert.equal(previous.status, 'ready');

const clamped = previousReplayState(previousReplayState(initial));
assert.equal(clamped.cursorIndex, 0);
assert.equal(clamped.cursorTime, session.startTime);
assert.equal(clamped.revealedCount, 1);
assert.equal(clamped.status, 'ready');

const ended = nextReplayState(nextReplayState(nextReplayState(nextReplayState(initial))));
assert.equal(ended.status, 'ended');
const previousFromEnded = previousReplayState(ended);
assert.equal(previousFromEnded.status, 'ready');
assert.equal(previousFromEnded.cursorIndex, 2);
assert.equal(previousFromEnded.cursorTime, '2026-06-01T09:40:00.000Z');

clearCommandsForTest();
clearEventsForTest();

const rewoundEvents = [];
const playbackEvents = [];
const unsubscribeRewound = subscribeEvent(REPLAY_EVENTS.REWOUND, (payload) => rewoundEvents.push(payload));
const unsubscribePlayback = subscribeEvent(REPLAY_EVENTS.PLAYBACK_CHANGED, (payload) => playbackEvents.push(payload));
const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
await registry.start({ emitEvent });

assert.equal(hasCommand(REPLAY_COMMANDS.PREVIOUS), true);
await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, session);
await dispatchCommand(REPLAY_COMMANDS.NEXT);
await dispatchCommand(REPLAY_COMMANDS.NEXT);

const runtimePrevious = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
assert.equal(runtimePrevious.cursorIndex, 1);
assert.equal(runtimePrevious.cursorTime, '2026-06-01T09:35:00.000Z');
assert.equal(runtimePrevious.revealedCount, 2);
assert.equal(runtimePrevious.status, 'ready');
assert.equal(rewoundEvents.length, 1);

await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
const runtimeClamped = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
assert.equal(runtimeClamped.cursorIndex, 0);
assert.equal(runtimeClamped.cursorTime, session.startTime);
assert.equal(runtimeClamped.revealedCount, 1);

await dispatchCommand(REPLAY_COMMANDS.NEXT);
await dispatchCommand(REPLAY_COMMANDS.PLAY);
const runtimePreviousFromPlaying = await dispatchCommand(REPLAY_COMMANDS.PREVIOUS);
assert.equal(runtimePreviousFromPlaying.status, 'ready');
assert.equal(runtimePreviousFromPlaying.cursorIndex, 0);
assert.equal(playbackEvents.at(-1).status, 'ready');

await registry.stop();
unsubscribeRewound();
unsubscribePlayback();

const shell = await read('v6/src/shell/workstation-shell.js');
const transport = await read('v6/src/shell/replay-transport.js');
const chartEntryManualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const chartDataRuntime = await read('v6/src/chart-data/chart-data-runtime.js');

assert.match(shell, /data-v6-transport-step-back disabled/);
assert.doesNotMatch(transport, /transport-action="previous"|case 'previous'|case "previous"/);
assert.doesNotMatch(chartEntryManualNext, /REPLAY_COMMANDS\.PREVIOUS|MANUAL_PREVIOUS/i);
assert.doesNotMatch(chartDataRuntime, /ROLLBACK|REMOVE_BARS|removeBars|rollback/i);

console.log('v6 replay previous domain command step 236 smoke passed');
