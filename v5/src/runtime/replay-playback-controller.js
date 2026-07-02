import { REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { normalizeStepCount } from './replay-runtime-state.js';

export function createReplayPlaybackController({
  getSessionId,
  advanceReplay,
  emitEvent,
  replayEvents = REPLAY_EVENTS,
  setTimer = globalThis.setInterval?.bind(globalThis),
  clearTimer = globalThis.clearInterval?.bind(globalThis),
}) {
  let playback = {
    playing: false,
    intervalMs: 500,
    stepCount: 1,
    timerId: null,
    advancing: false,
    stoppedReason: null,
  };

  function snapshot() {
    return {
      playing: playback.playing,
      intervalMs: playback.intervalMs,
      stepCount: playback.stepCount,
      stoppedReason: playback.stoppedReason,
    };
  }

  function setPlayback(nextPlayback) {
    playback = {
      ...playback,
      ...nextPlayback,
    };
    const nextSnapshot = snapshot();
    emitEvent(replayEvents.PLAYBACK_CHANGED, nextSnapshot);
    return nextSnapshot;
  }

  async function tick(sessionId) {
    if (playback.advancing || !playback.playing) return;
    playback.advancing = true;
    try {
      const result = await advanceReplay({ sessionId, stepCount: playback.stepCount || 1 });
      if (!result.advanced) {
        pause({ reason: result.reason || 'stopped' });
      }
    } finally {
      playback.advancing = false;
    }
  }

  function play({ sessionId = getSessionId(), intervalMs = 500, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedInterval = Number(intervalMs);
    if (!Number.isFinite(normalizedInterval) || normalizedInterval <= 0) {
      throw new Error('replay play intervalMs must be a positive number.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
    if (playback.playing) {
      return snapshot();
    }
    if (typeof setTimer !== 'function' || typeof clearTimer !== 'function') {
      throw new Error('replay playback timers are unavailable.');
    }

    const timerId = setTimer(() => tick(sessionId), normalizedInterval);
    return setPlayback({
      playing: true,
      intervalMs: normalizedInterval,
      stepCount: normalizedStepCount,
      timerId,
      stoppedReason: null,
    });
  }

  function pause({ reason = null } = {}) {
    if (playback.timerId !== null && typeof clearTimer === 'function') {
      clearTimer(playback.timerId);
    }
    return setPlayback({
      playing: false,
      timerId: null,
      stoppedReason: reason,
    });
  }

  function reset() {
    pause();
    playback = {
      playing: false,
      intervalMs: 500,
      stepCount: 1,
      timerId: null,
      advancing: false,
      stoppedReason: null,
    };
  }

  return {
    pause,
    play,
    reset,
    snapshot,
  };
}
