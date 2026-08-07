export const DEFAULT_AUTOPLAY_CADENCE_MS = 500;

function method(port, name) {
  if (!port || typeof port[name] !== 'function') {
    throw new TypeError(`Replay Autoplay scheduler requires ${name}().`);
  }
  return port[name].bind(port);
}

/**
 * Owns single-flight start-to-start Autoplay cadence only. Replay Runtime
 * remains the playback/cursor owner and Workspace Execution remains the
 * transaction owner.
 */
export function createReplayAutoplayScheduler({
  cadenceMs = DEFAULT_AUTOPLAY_CADENCE_MS,
  clearTimer = clearTimeout,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  playbackPort,
  runNext,
  setTimer = setTimeout,
}) {
  function assertCadence(value) {
    if (Number.isSafeInteger(value) && value >= 1 && value <= 60_000) return value;
    throw new TypeError('Replay Autoplay cadence must be between 1 and 60000ms.');
  }
  let currentCadenceMs = assertCadence(cadenceMs);
  if (typeof clearTimer !== 'function' || typeof now !== 'function'
    || typeof setTimer !== 'function' || typeof runNext !== 'function') {
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
    return Object.freeze({ active, cadenceMs: currentCadenceMs, scheduled: timerId !== null, ticking });
  }

  function stop({ publishPause = true } = {}) {
    generation += 1;
    active = false;
    clearScheduled();
    if (publishPause && !disposed) pausePlayback();
    return state();
  }

  function schedule(token, delayMs = currentCadenceMs) {
    if (disposed || !active || token !== generation) return;
    clearScheduled();
    timerId = setTimer(() => {
      timerId = null;
      void tick(token);
    }, delayMs);
  }

  async function tick(token) {
    if (disposed || !active || ticking || token !== generation) return state();
    const before = readPlayback();
    if (before.playback !== 'playing' || before.complete) return stop();
    const startedAt = now();
    ticking = true;
    try {
      const result = await runNext();
      if (disposed || !active || token !== generation) return state();
      const replay = readPlayback();
      if (!result || result.status !== 'committed' || replay.playback !== 'playing' || replay.complete) {
        return stop();
      }
      const elapsedMs = Math.max(0, now() - startedAt);
      schedule(token, Math.max(0, currentCadenceMs - elapsedMs));
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
    setCadenceMs(value) {
      const nextCadenceMs = assertCadence(value);
      if (nextCadenceMs === currentCadenceMs) return state();
      currentCadenceMs = nextCadenceMs;
      if (active && !ticking) schedule(generation);
      return state();
    },
    snapshot: state,
  });
}
