import assert from 'node:assert/strict';
import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';

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
    intervalDelay() {
      return [...intervals.values()][0]?.delayMs ?? null;
    },
    setInterval(callback, delayMs) {
      const id = nextId;
      nextId += 1;
      intervals.set(id, { callback, delayMs });
      return id;
    },
    async tick() {
      await Promise.all([...intervals.values()].map((interval) => interval.callback()));
    },
  };
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const calls = [];
let cursorIndex = 0;
const events = [];
const unsubscribeStarted = subscribeEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED, (payload) => {
  events.push({ event: CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED, payload });
});
const unsubscribeTicked = subscribeEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED, (payload) => {
  events.push({ event: CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED, payload });
});
const unsubscribeStopped = subscribeEvent(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, (payload) => {
  events.push({ event: CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, payload });
});

registerCommand(REPLAY_COMMANDS.PLAY, () => {
  calls.push(REPLAY_COMMANDS.PLAY);
  return {
    cursorIndex,
    status: 'playing',
  };
});
registerCommand(REPLAY_COMMANDS.PAUSE, () => {
  calls.push(REPLAY_COMMANDS.PAUSE);
  return {
    cursorIndex,
    status: 'paused',
  };
});
registerCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, () => {
  calls.push(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
  cursorIndex += 1;
  return {
    advanced: {
      replayState: {
        cursorIndex,
        status: cursorIndex >= 2 ? 'ended' : 'playing',
      },
    },
    status: 'advanced',
  };
});

const registry = createRuntimeRegistry();
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent });

assert.equal(hasCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START), true);
assert.equal(hasCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP), true);
assert.equal(listenerCount(CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED), 1);
assert.deepEqual(await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE), {
  error: null,
  lastTick: null,
  playing: false,
  speed: 1,
  status: 'idle',
});

const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { speed: 2 });
assert.equal(started.playing, true);
assert.equal(started.speed, 2);
assert.equal(started.status, 'playing');
assert.equal(fakeTimer.intervalCount(), 1);
assert.equal(fakeTimer.intervalDelay(), 250);
assert.deepEqual(calls, [REPLAY_COMMANDS.PLAY]);

await fakeTimer.tick();
let state = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
assert.equal(state.status, 'playing');
assert.equal(state.lastTick.replayState.cursorIndex, 1);
assert.equal(fakeTimer.intervalCount(), 1);

await fakeTimer.tick();
state = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
assert.equal(state.status, 'ended');
assert.equal(state.playing, false);
assert.equal(state.lastTick.replayState.cursorIndex, 2);
assert.equal(fakeTimer.intervalCount(), 0);
assert.equal(calls.filter((command) => command === CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT).length, 2);
assert.equal(events.some((entry) => entry.event === CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED), true);
assert.equal(events.at(-1).event, CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED);

cursorIndex = 0;
await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { speed: 4 });
const stopped = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
assert.equal(stopped.status, 'paused');
assert.equal(stopped.playing, false);
assert.equal(fakeTimer.intervalCount(), 0);
assert.equal(calls.at(-1), REPLAY_COMMANDS.PAUSE);

await assert.rejects(
  () => dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, { speed: 3 }),
  /unsupported speed/,
);

await registry.stop();
assert.equal(hasCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START), false);
unsubscribeStarted();
unsubscribeTicked();
unsubscribeStopped();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 chart entry auto play runtime smoke passed');
