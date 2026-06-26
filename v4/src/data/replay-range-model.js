const MINUTE_SECONDS = 60;

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeTimeframe(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function parseReplayDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0)
  );
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

export function formatReplayTimestamp(timestamp) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return '';
  const date = new Date(seconds * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function normalizeReplayOuterRange(input = {}) {
  const start = normalizeString(input.start);
  const end = normalizeString(input.end);
  const timeframe = normalizeTimeframe(input.timeframe, 1);
  const startTs = parseReplayDateTime(start);
  const endTs = parseReplayDateTime(end);
  if (!start || !end || startTs === null || endTs === null || endTs < startTs) return null;
  return { start, end, timeframe, startTs, endTs };
}

export function clampReplayCursor(cursorTimestamp, outerRange) {
  const outer = normalizeReplayOuterRange(outerRange);
  if (!outer) return null;
  const requested = Number(cursorTimestamp);
  if (!Number.isFinite(requested)) return outer.startTs;
  return Math.max(outer.startTs, Math.min(outer.endTs, Math.floor(requested)));
}

export function createReplayRangeState({
  outerRange,
  cursorTimestamp,
  windowRange = null,
  visibleBars = [],
  loadedChunks = [],
  prefetchChunks = [],
} = {}) {
  const outer = normalizeReplayOuterRange(outerRange);
  const cursor = outer ? clampReplayCursor(cursorTimestamp, outer) : null;
  return {
    outerRange: outer,
    cursorTimestamp: cursor,
    windowRange,
    visibleBars: Array.isArray(visibleBars) ? [...visibleBars] : [],
    loadedChunks: Array.isArray(loadedChunks) ? [...loadedChunks] : [],
    prefetchChunks: Array.isArray(prefetchChunks) ? [...prefetchChunks] : [],
  };
}

export function isReplayFirstCandidate(start, end, timeframe) {
  const outer = normalizeReplayOuterRange({ start, end, timeframe });
  if (!outer || Number(outer.timeframe) !== 1) return false;
  return (outer.endTs - outer.startTs) > 14 * 24 * 60 * MINUTE_SECONDS;
}
