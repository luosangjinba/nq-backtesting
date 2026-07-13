export function parseLoadedWindowDateTimeLocal(value) {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error('Enter a valid UTC date and time.');
  }
  const parts = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5] || 0,
  ));
  const valid = !Number.isNaN(parsed.valueOf())
    && parsed.getUTCFullYear() === parts[0]
    && parsed.getUTCMonth() + 1 === parts[1]
    && parsed.getUTCDate() === parts[2]
    && parsed.getUTCHours() === parts[3]
    && parsed.getUTCMinutes() === parts[4]
    && parsed.getUTCSeconds() === (parts[5] || 0);
  if (!valid) {
    throw new Error('Enter a valid UTC date and time.');
  }
  return parsed.toISOString();
}
