import assert from 'node:assert/strict';
import { createReplayAutoplayScheduler } from '../src/replay-workspace-ui/autoplay-scheduler.js';

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

function fixture({ completeAfter = Number.POSITIVE_INFINITY, gate = null } = {}) {
  const scheduled = new Map();
  let nextTimerId = 0;
  let cursor = 0;
  let playback = 'paused';
  let runs = 0;
  const scheduler = createReplayAutoplayScheduler({
    cadenceMs: 500,
    clearTimer: (timerId) => scheduled.delete(timerId),
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
      cursor += 1;
      if (cursor >= completeAfter) playback = 'paused';
      return Object.freeze({ status: 'committed' });
    },
    setTimer(callback, delayMs) {
      assert.equal(delayMs, 500);
      const timerId = ++nextTimerId;
      scheduled.set(timerId, callback);
      return timerId;
    },
  });
  return Object.freeze({
    async fire() {
      const [timerId, callback] = scheduled.entries().next().value ?? [];
      if (!callback) return false;
      scheduled.delete(timerId);
      callback();
      await Promise.resolve();
      await Promise.resolve();
      return true;
    },
    read: () => Object.freeze({ cursor, playback, runs, scheduled: scheduled.size }),
    scheduler,
  });
}

let target = fixture();
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, playback: 'playing', runs: 1, scheduled: 1 },
  'Play performs one immediate visible step and schedules the next only after completion');
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, playback: 'playing', runs: 2, scheduled: 1 });
target.scheduler.pause();
assert.deepEqual(target.read(), { cursor: 2, playback: 'paused', runs: 2, scheduled: 0 });
assert.equal(await target.fire(), false, 'Pause removes all future cadence work');

const pendingGate = deferred();
target = fixture({ gate: pendingGate });
target.scheduler.play();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 0, playback: 'playing', runs: 1, scheduled: 0 },
  'no interval backlog exists while one atomic tick is pending');
target.scheduler.pause();
pendingGate.resolve();
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(target.read(), { cursor: 1, playback: 'paused', runs: 1, scheduled: 0 },
  'Pause during an in-flight atomic tick allows settlement but schedules no successor');

target = fixture({ completeAfter: 2 });
target.scheduler.play();
await Promise.resolve();
await Promise.resolve();
assert.equal(target.read().scheduled, 1);
await target.fire();
assert.deepEqual(target.read(), { cursor: 2, playback: 'paused', runs: 2, scheduled: 0 },
  'Session completion pauses Replay and terminates cadence');

assert.throws(
  () => createReplayAutoplayScheduler({ cadenceMs: 0, playbackPort: {}, runNext() {} }),
  /cadence/,
);
assert.throws(
  () => createReplayAutoplayScheduler({ playbackPort: {}, runNext() {} }),
  /requires pause/,
);

console.log('v7 Replay Autoplay scheduler harness passed', {
  scope: 'continuous completion cadence, no backlog, Pause, in-flight settlement, Session end',
});
