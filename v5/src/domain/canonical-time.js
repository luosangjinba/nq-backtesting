const WALL_CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d{3}Z)?$/;

export function parseCanonicalWallClockMs(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(WALL_CLOCK_PATTERN);
  if (!match) return null;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0)
  );
}

export function parseCanonicalTimeMs(value) {
  const wallClockMs = parseCanonicalWallClockMs(value);
  if (wallClockMs != null) return wallClockMs;
  return Date.parse(value);
}
