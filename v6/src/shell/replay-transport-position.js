function normalizeFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function clampReplayTransportPosition({
  height = 0,
  left = 0,
  top = 0,
  viewportHeight = 0,
  viewportWidth = 0,
  width = 0,
} = {}) {
  const safeWidth = Math.max(0, normalizeFiniteNumber(width));
  const safeHeight = Math.max(0, normalizeFiniteNumber(height));
  const safeViewportWidth = Math.max(0, normalizeFiniteNumber(viewportWidth));
  const safeViewportHeight = Math.max(0, normalizeFiniteNumber(viewportHeight));
  const maxLeft = Math.max(0, safeViewportWidth - safeWidth);
  const maxTop = Math.max(0, safeViewportHeight - safeHeight);
  return Object.freeze({
    left: Math.min(maxLeft, Math.max(0, normalizeFiniteNumber(left))),
    top: Math.min(maxTop, Math.max(0, normalizeFiniteNumber(top))),
  });
}

export function createReplayTransportPositionSnapshot({
  height = 0,
  left = 0,
  top = 0,
  width = 0,
} = {}) {
  return Object.freeze({
    height: Math.max(0, normalizeFiniteNumber(height)),
    left: normalizeFiniteNumber(left),
    top: normalizeFiniteNumber(top),
    width: Math.max(0, normalizeFiniteNumber(width)),
  });
}
