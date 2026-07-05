import assert from 'node:assert/strict';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';

function createFakeTimer() {
  let nextId = 1;
  const intervals = new Map();
  return {
    clearInterval(id) {
      intervals.delete(id);
    },
    intervalCount() {
      return intervals.size;
    },
    setInterval(callback, delayMs) {
      const id = nextId;
      nextId += 1;
      intervals.set(id, { callback, delayMs });
      return id;
    },
    tick() {
      [...intervals.values()].forEach((interval) => interval.callback());
    },
  };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const loadedEvents = [];
const advancedEvents = [];
const playbackEvents = [];
const resetEvents = [];
const unsubscribeLoaded = subscribeEvent(REPLAY_EVENTS.LOADED, (payload) => loadedEvents.push(payload));
const unsubscribeAdvanced = subscribeEvent(REPLAY_EVENTS.ADVANCED, (payload) => advancedEvents.push(payload));
const unsubscribePlayback = subscribeEvent(REPLAY_EVENTS.PLAYBACK_CHANGED, (payload) => playbackEvents.push(payload));
const unsubscribeReset = subscribeEvent(REPLAY_EVENTS.RESET, (payload) => resetEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime({
  playIntervalMs: 25,
  timer: fakeTimer,
}));
await registry.start({ emitEvent });

assert.equal(hasCommand(REPLAY_COMMANDS.LOAD_SESSION), true);
assert.equal(await dispatchCommand(REPLAY_COMMANDS.GET_STATE), null);
assert.equal(listenerCount(REPLAY_EVENTS.ADVANCED), 1);

const session = {
  endTime: '2026-06-01T09:32:00.000Z',
  id: 'session-1',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
};
const loaded = await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, session);
assert.equal(loaded.cursorTime, session.startTime);
assert.equal(loaded.revealedCount, 1);
assert.equal(loaded.totalBars, 3);
assert.equal(loadedEvents.length, 1);

const next = await dispatchCommand(REPLAY_COMMANDS.NEXT);
assert.equal(next.cursorTime, '2026-06-01T09:31:00.000Z');
assert.equal(next.revealedCount, 2);
assert.equal(advancedEvents.length, 1);

const playing = await dispatchCommand(REPLAY_COMMANDS.PLAY);
assert.equal(playing.status, 'playing');
assert.equal(fakeTimer.intervalCount(), 1);
assert.equal(playbackEvents.at(-1).status, 'playing');

fakeTimer.tick();
const ended = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(ended.cursorTime, session.endTime);
assert.equal(ended.revealedCount, 3);
assert.equal(ended.status, 'ended');
assert.equal(fakeTimer.intervalCount(), 0);

fakeTimer.tick();
const stillEnded = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(stillEnded.cursorTime, session.endTime);
assert.equal(stillEnded.revealedCount, 3);
assert.equal(stillEnded.totalBars, 3);

const reset = await dispatchCommand(REPLAY_COMMANDS.RESET);
assert.equal(reset.cursorTime, session.startTime);
assert.equal(reset.revealedCount, 1);
assert.equal(reset.status, 'ready');
assert.equal(resetEvents.length, 1);

await dispatchCommand(REPLAY_COMMANDS.PLAY);
const paused = await dispatchCommand(REPLAY_COMMANDS.PAUSE);
assert.equal(paused.status, 'paused');
assert.equal(fakeTimer.intervalCount(), 0);

await registry.stop();
assert.equal(hasCommand(REPLAY_COMMANDS.LOAD_SESSION), false);
unsubscribeLoaded();
unsubscribeAdvanced();
unsubscribePlayback();
unsubscribeReset();
assert.equal(listenerCount(REPLAY_EVENTS.LOADED), 0);

console.log('v6 replay runtime smoke passed');
