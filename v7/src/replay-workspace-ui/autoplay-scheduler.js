export const DEFAULT_AUTOPLAY_CADENCE_MS = 500;

function method(port, name) {
  if (!port || typeof port[name] !== 'function') {
    throw new TypeError(`Replay Autoplay scheduler requires ${name}().`);
  }
  return port[name].bind(port);
}

/**
 * Owns completion-driven Autoplay cadence only. Replay Runtime remains the
 * playback/cursor owner and Workspace Execution remains the transaction owner.
 */
export function createReplayAutoplayScheduler({
  cadenceMs = DEFAULT_AUTOPLAY_CADENCE_MS,
  clearTimer = clearTimeout,
  playbackPort,
  runNext,
  setTimer = setTimeout,
}) {
  if (!Number.isSafeInteger(cadenceMs) || cadenceMs < 1 || cadenceMs > 60_000) {
    throw new TypeError('Replay Autoplay cadence must be between 1 and 60000ms.');
  }
  if (typeof clearTimer !== 'function' || typeof setTimer !== 'function' || typeof runNext !== 'function') {
    throw new TypeError('Replay Autoplay scheduler ports are invalid.');
  }
  const pausePlayback = method(playbackPort, 'pause');
  const playPlayback = method(playbackPort, 'play');
  const readPlayback = method(playbackPort, 'snapshot');
  let active = false;
  let disposed = false;
  let generation = 0;
  let timerId = null;
  let ticking = false;

  function clearScheduled() {
    if (timerId === null) return;
    clearTimer(timerId);
    timerId = null;
  }

  function state() {
    return Object.freeze({ active, scheduled: timerId !== null, ticking });
  }

  function stop({ publishPause = true } = {}) {
    generation += 1;
    active = false;
    clearScheduled();
    if (publishPause && !disposed) pausePlayback();
    return state();
  }

  function schedule(token) {
    if (disposed || !active || token !== generation) return;
    clearScheduled();
    timerId = setTimer(() => {
      timerId = null;
      void tick(token);
    }, cadenceMs);
  }

  async function tick(token) {
    if (disposed || !active || ticking || token !== generation) return state();
    const before = readPlayback();
    if (before.playback !== 'playing' || before.complete) return stop();
    ticking = true;
    try {
      const result = await runNext();
      if (disposed || !active || token !== generation) return state();
      const replay = readPlayback();
      if (!result || result.status !== 'committed' || replay.playback !== 'playing' || replay.complete) {
        return stop();
      }
      schedule(token);
      return state();
    } catch {
      return stop();
    } finally {
      ticking = false;
    }
  }

  function play() {
    if (disposed || active) return state();
    const replay = playPlayback();
    if (replay.playback !== 'playing' || replay.complete) return state();
    generation += 1;
    active = true;
    void tick(generation);
    return state();
  }

  return Object.freeze({
    dispose() {
      if (disposed) return;
      stop({ publishPause: false });
      disposed = true;
    },
    pause: () => stop(),
    play,
    snapshot: state,
  });
}
