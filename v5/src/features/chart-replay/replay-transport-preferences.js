export const REPLAY_TRANSPORT_PREFERENCES_KEY = 'v5.replayTransportPreferences';

const DEFAULT_PLAYBACK_INTERVAL_MS = 500;

function storageRef() {
  return globalThis.localStorage || null;
}

function safeNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizePosition(position) {
  if (!position || typeof position !== 'object') return null;
  const left = Number(position.left);
  const top = Number(position.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { left, top };
}

export function loadReplayTransportPreferences({ storage = storageRef() } = {}) {
  if (!storage) {
    return {
      playbackIntervalMs: DEFAULT_PLAYBACK_INTERVAL_MS,
      floatingPosition: null,
    };
  }
  try {
    const parsed = JSON.parse(storage.getItem(REPLAY_TRANSPORT_PREFERENCES_KEY) || '{}');
    return {
      playbackIntervalMs: safeNumber(parsed.playbackIntervalMs, DEFAULT_PLAYBACK_INTERVAL_MS),
      floatingPosition: normalizePosition(parsed.floatingPosition),
    };
  } catch {
    return {
      playbackIntervalMs: DEFAULT_PLAYBACK_INTERVAL_MS,
      floatingPosition: null,
    };
  }
}

export function saveReplayTransportPreferences(nextPreferences, { storage = storageRef() } = {}) {
  if (!storage) return loadReplayTransportPreferences({ storage });
  const current = loadReplayTransportPreferences({ storage });
  const next = {
    playbackIntervalMs: safeNumber(nextPreferences?.playbackIntervalMs, current.playbackIntervalMs),
    floatingPosition: Object.prototype.hasOwnProperty.call(nextPreferences || {}, 'floatingPosition')
      ? normalizePosition(nextPreferences.floatingPosition)
      : current.floatingPosition,
  };
  storage.setItem(REPLAY_TRANSPORT_PREFERENCES_KEY, JSON.stringify(next));
  return next;
}

export function saveReplayPlaybackInterval(intervalMs, options) {
  const current = loadReplayTransportPreferences(options);
  return saveReplayTransportPreferences({
    ...current,
    playbackIntervalMs: intervalMs,
  }, options);
}

export function saveReplayFloatingPosition(position, options) {
  const current = loadReplayTransportPreferences(options);
  return saveReplayTransportPreferences({
    ...current,
    floatingPosition: position,
  }, options);
}
