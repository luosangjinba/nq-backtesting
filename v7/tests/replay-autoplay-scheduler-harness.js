import assert from 'node:assert/strict';
import { createReplayAutoplayScheduler } from '../src/replay-workspace-composition/public.js';
import {
  AUTOPLAY_SPEED_OPTIONS,
  DEFAULT_AUTOPLAY_SPEED,
  readAutoplaySpeed,
} from '../src/replay-workspace-composition/public.js';

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

function fixture({
  completeAfter = Number.POSITIVE_INFINITY,
  gate = null,
  transactionDurationMs = 0,
} = {}) {
  const scheduled = new Map();
  let clockMs = 0;
  let nextTimerId = 0;
  let cursor = 0;
  let playback = 'paused';
  let runs = 0;
  const scheduler = createReplayAutoplayScheduler({
    cadenceMs: 500,
    clearTimer: (timerId) => scheduled.delete(timerId),
    now: () => clockMs,
    playbackPort: Object.freeze({
      pause() {
        playback = 'paused';
        return this.snapshot();
      },
      play() {
        playback = 'playing';
        return this.snapshot();
      },
      snapshot: () => Object.freeze({
        complete: cursor >= completeAfter,
        cursorEpochMs: cursor,
        playback,
      }),
    }),
    async runNext() {
      runs += 1;
      if (gate) await gate.promise;
      clockMs += transactionDurationMs;
      cursor += 1;
      if (cursor >= completeAfter) playback = 'paused';
      return Object.freeze({ status: 'committed' });
    },
    setTimer(callback, delayMs) {
      const timerId = ++nextTimerId;
      scheduled.set(timerId, { callback, delayMs });
      return timerId;
    },
  });
  return Object.freeze({
    async fire() {
      const [timerId, pending] = scheduled.entries().next().value ?? [];
      if (!pending) return false;
      scheduled.delete(timerId);
      clockMs += pending.delayMs;
      pending.callback();
      await Promise.resolve();
      await Promise.resolve();
      return true;
    },
    read: () => Object.freeze({
      cursor,
      delayMs: scheduled.values().next().value?.delayMs ?? null,
      playback,
      runs,
      scheduled: scheduled.size,
    }),
    scheduler,
  });
}

let target = fixture();
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, delayMs: 500, playback: 'playing', runs: 1, scheduled: 1 },
  'Play performs one immediate visible step and schedules the next only after completion');
target.scheduler.setCadenceMs(250);
assert.deepEqual(target.read(), { cursor: 1, delayMs: 250, playback: 'playing', runs: 1, scheduled: 1 },
  'changing speed while scheduled replaces one future timeout without adding a backlog');
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, delayMs: 250, playback: 'playing', runs: 2, scheduled: 1 });
target.scheduler.pause();
assert.deepEqual(target.read(), { cursor: 2, delayMs: null, playback: 'paused', runs: 2, scheduled: 0 });
assert.equal(await target.fire(), false, 'Pause removes all future cadence work');

target = fixture({ transactionDurationMs: 180 });
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, delayMs: 320, playback: 'playing', runs: 1, scheduled: 1 },
  'Autoplay subtracts committed transaction time from the start-to-start cadence');
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, delayMs: 320, playback: 'playing', runs: 2, scheduled: 1 },
  'each successor keeps one compensated timer without accumulating drift');
target.scheduler.pause();

target = fixture({ transactionDurationMs: 650 });
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, delayMs: 0, playback: 'playing', runs: 1, scheduled: 1 },
  'work above cadence saturates at one zero-delay successor instead of creating a backlog');
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, delayMs: 0, playback: 'playing', runs: 2, scheduled: 1 },
  'zero-delay saturation still advances exactly once and retains one future timer');
target.scheduler.pause();

const pendingGate = deferred();
target = fixture({ gate: pendingGate });
target.scheduler.play();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 0, delayMs: null, playback: 'playing', runs: 1, scheduled: 0 },
  'no interval backlog exists while one atomic tick is pending');
target.scheduler.setCadenceMs(100);
target.scheduler.pause();
pendingGate.resolve();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, delayMs: null, playback: 'paused', runs: 1, scheduled: 0 },
  'Pause during an in-flight atomic tick allows settlement but schedules no successor');

target = fixture({ completeAfter: 2 });
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.equal(target.read().scheduled, 1);
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, delayMs: null, playback: 'paused', runs: 2, scheduled: 0 },
  'Session completion pauses Replay and terminates cadence');

assert.throws(
  () => createReplayAutoplayScheduler({ cadenceMs: 0, playbackPort: {}, runNext() {} }),
  /cadence/,
);
assert.throws(() => target.scheduler.setCadenceMs(0), /cadence/);
assert.throws(
  () => createReplayAutoplayScheduler({ playbackPort: {}, runNext() {} }),
  /requires pause/,
);
assert.deepEqual(AUTOPLAY_SPEED_OPTIONS.map(({ cadenceMs, label, multiplier }) => (
  { cadenceMs, label, multiplier }
)), [
  { cadenceMs: 1_000, label: '0.5×', multiplier: 0.5 },
  { cadenceMs: 500, label: '1×', multiplier: 1 },
  { cadenceMs: 250, label: '2×', multiplier: 2 },
  { cadenceMs: 100, label: '5×', multiplier: 5 },
]);
assert.equal(DEFAULT_AUTOPLAY_SPEED, readAutoplaySpeed('autoplay-speed-1x'));
assert.throws(() => readAutoplaySpeed('autoplay-speed-unknown'), /Unsupported/);

console.log('v7 Replay Autoplay scheduler harness passed', {
  scope: 'start-to-start cadence, bounded compensation, no backlog, Pause, in-flight settlement, Session end',
});
