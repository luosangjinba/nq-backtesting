const DEFAULT_STORAGE_KEY = 'v6.replayTransport.position';

function parsePosition(value) {
  if (!value) return null;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  const left = Number(parsed?.left);
  const top = Number(parsed?.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  const width = Number(parsed?.width);
  const height = Number(parsed?.height);
  return Object.freeze({
    height: Number.isFinite(height) ? height : 0,
    left,
    top,
    width: Number.isFinite(width) ? width : 0,
  });
}

export function createReplayTransportPositionPreference({
  storage = globalThis?.localStorage,
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) {
  return Object.freeze({
    load() {
      try {
        return parsePosition(storage?.getItem?.(storageKey));
      } catch {
        return null;
      }
    },
    save(position) {
      const parsedPosition = parsePosition(position);
      if (!parsedPosition) return;
      storage?.setItem?.(storageKey, JSON.stringify(parsedPosition));
    },
  });
}
