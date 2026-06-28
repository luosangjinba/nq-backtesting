const DEFAULT_MODE = 'idle';
const DEFAULT_TIMEFRAME = 1;
const DEFAULT_VIEWPORT_BAR_CAPACITY = 260;
const DEFAULT_PREFIX_PADDING_BARS = 40;
const DEFAULT_PREFIX_CHUNK_BARS = 260;

export const REPLAY_SESSION_CHUNK_REASONS = Object.freeze({
  INITIAL_PREFIX: 'initial-prefix',
  PREVIOUS_PREFIX: 'previous-prefix',
  NEXT_FORWARD_BAR: 'next-forward-bar',
});

const VALID_CHUNK_REASONS = new Set(Object.values(REPLAY_SESSION_CHUNK_REASONS));

let activeReplaySession = null;

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

export function getTimeframeSeconds(timeframe) {
  const parsed = Math.floor(Number(timeframe));
  return Number.isFinite(parsed) && parsed > 0 ? parsed * 60 : DEFAULT_TIMEFRAME * 60;
}

export function formatReplaySessionDateTime(timestamp) {
  const parsed = normalizeTimestamp(timestamp);
  if (parsed === null) return '';
  const date = new Date(parsed * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function parseReplaySessionDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0
  );
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function normalizeSessionTimestamp(value) {
  if (typeof value === 'string') return parseReplaySessionDateTime(value);
  return normalizeTimestamp(value);
}

function normalizeChunk(chunk, index) {
  const reason = VALID_CHUNK_REASONS.has(chunk?.reason) ? chunk.reason : REPLAY_SESSION_CHUNK_REASONS.INITIAL_PREFIX;
  const startTs = normalizeTimestamp(chunk?.startTs);
  const endTs = normalizeTimestamp(chunk?.endTs);
  if (startTs === null || endTs === null || endTs < startTs) return null;
  return {
    id: normalizeString(chunk?.id, `${reason}-${startTs}-${endTs}-${index}`),
    reason,
    startTs,
    endTs,
    loadedAt: normalizeTimestamp(chunk?.loadedAt) ?? null,
  };
}

export function createReplaySession(input = {}) {
  const sessionStart = normalizeSessionTimestamp(input.sessionStart);
  const sessionEnd = normalizeSessionTimestamp(input.sessionEnd);
  if (sessionStart === null || sessionEnd === null || sessionEnd < sessionStart) {
    throw new Error('Replay session requires valid sessionStart/sessionEnd timestamps');
  }

  const timeframe = normalizePositiveInteger(input.timeframe, DEFAULT_TIMEFRAME);
  const cursor = normalizeSessionTimestamp(input.cursor) ?? sessionStart;
  const clippedCursor = Math.max(sessionStart, Math.min(cursor, sessionEnd));
  const loadedChunks = Array.isArray(input.loadedChunks)
    ? input.loadedChunks.map(normalizeChunk).filter(Boolean)
    : [];

  return {
    active: input.active !== undefined ? normalizeBoolean(input.active) : true,
    instrument: normalizeString(input.instrument, 'NQ').toUpperCase(),
    timeframe,
    sessionStart,
    sessionEnd,
    cursor: clippedCursor,
    autoUpdateEnd: normalizeBoolean(input.autoUpdateEnd),
    mode: normalizeString(input.mode, DEFAULT_MODE),
    loadedChunks,
    visibleChunkRange: normalizeVisibleChunkRange(input.visibleChunkRange),
    dataEarliestTimestamp: normalizeTimestamp(input.dataEarliestTimestamp),
    dataLatestLoadedTimestamp: normalizeTimestamp(input.dataLatestLoadedTimestamp),
  };
}

function normalizeVisibleChunkRange(range) {
  const startTs = normalizeTimestamp(range?.startTs);
  const endTs = normalizeTimestamp(range?.endTs);
  if (startTs === null || endTs === null || endTs < startTs) return null;
  return { startTs, endTs };
}

export function updateReplaySession(session, patch = {}) {
  const current = createReplaySession(session);
  return createReplaySession({
    ...current,
    ...patch,
    loadedChunks: patch.loadedChunks ?? current.loadedChunks,
  });
}

export function resetReplaySession() {
  return null;
}

export function setActiveReplaySession(session) {
  activeReplaySession = session ? createReplaySession(session) : null;
  return getActiveReplaySession();
}

export function updateActiveReplaySession(patch = {}) {
  if (!activeReplaySession) return null;
  activeReplaySession = updateReplaySession(activeReplaySession, patch);
  return getActiveReplaySession();
}

export function clearActiveReplaySession() {
  activeReplaySession = null;
  return null;
}

export function getActiveReplaySession() {
  return activeReplaySession ? serializeReplaySession(activeReplaySession) : null;
}

export function hasActiveReplaySession() {
  return Boolean(activeReplaySession?.active);
}

export function serializeReplaySession(session) {
  if (!session) return null;
  const normalized = createReplaySession(session);
  return {
    ...normalized,
    loadedChunks: normalized.loadedChunks.map((chunk) => ({ ...chunk })),
    visibleChunkRange: normalized.visibleChunkRange ? { ...normalized.visibleChunkRange } : null,
  };
}

function makeChunkRequest({ session, reason, startTs, endTs }) {
  if (!session?.active) {
    return { ok: false, message: 'No active replay session', request: null };
  }
  if (!VALID_CHUNK_REASONS.has(reason)) {
    return { ok: false, message: 'Invalid replay chunk reason', request: null };
  }
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs < startTs) {
    return { ok: false, message: 'Invalid replay chunk range', request: null };
  }

  const cursor = normalizeTimestamp(session.cursor);
  if (cursor === null) return { ok: false, message: 'Replay session cursor is invalid', request: null };

  if (reason !== REPLAY_SESSION_CHUNK_REASONS.NEXT_FORWARD_BAR && endTs > cursor) {
    return {
      ok: false,
      message: 'Replay prefix requests cannot load bars after cursor',
      request: null,
    };
  }

  if (reason === REPLAY_SESSION_CHUNK_REASONS.NEXT_FORWARD_BAR) {
    const tfSeconds = getTimeframeSeconds(session.timeframe);
    const expectedEnd = cursor + tfSeconds;
    if (startTs !== cursor || endTs !== expectedEnd) {
      return {
        ok: false,
        message: 'Forward replay request must target the minimal cursor-to-next-bar window',
        request: null,
      };
    }
    if (endTs > session.sessionEnd) {
      return {
        ok: false,
        message: 'Replay session finished',
        request: null,
        finished: true,
      };
    }
  }

  return {
    ok: true,
    message: '',
    request: {
      instrument: session.instrument,
      timeframe: session.timeframe,
      reason,
      startTs,
      endTs,
      start: formatReplaySessionDateTime(startTs),
      end: formatReplaySessionDateTime(endTs),
    },
  };
}

export function planInitialPrefixRequest(session, options = {}) {
  const normalized = createReplaySession(session);
  const tfSeconds = getTimeframeSeconds(normalized.timeframe);
  const viewportBars = normalizePositiveInteger(options.viewportBarCapacity, DEFAULT_VIEWPORT_BAR_CAPACITY);
  const paddingBars = Math.max(0, Math.floor(Number(options.paddingBars ?? DEFAULT_PREFIX_PADDING_BARS)));
  const totalBars = viewportBars + paddingBars;
  const endTs = normalized.cursor;
  const startTs = endTs - Math.max(0, totalBars - 1) * tfSeconds;
  return makeChunkRequest({
    session: normalized,
    reason: REPLAY_SESSION_CHUNK_REASONS.INITIAL_PREFIX,
    startTs,
    endTs,
  });
}

export function planPreviousPrefixRequest(session, options = {}) {
  const normalized = createReplaySession(session);
  const tfSeconds = getTimeframeSeconds(normalized.timeframe);
  const chunkBars = normalizePositiveInteger(options.chunkBars, DEFAULT_PREFIX_CHUNK_BARS);
  const earliestLoaded = normalizeTimestamp(options.earliestLoadedTimestamp ?? normalized.dataEarliestTimestamp);
  if (earliestLoaded === null) {
    return { ok: false, message: 'No earliest loaded timestamp for prefix request', request: null };
  }
  const endTs = earliestLoaded - tfSeconds;
  const startTs = endTs - Math.max(0, chunkBars - 1) * tfSeconds;
  return makeChunkRequest({
    session: normalized,
    reason: REPLAY_SESSION_CHUNK_REASONS.PREVIOUS_PREFIX,
    startTs,
    endTs,
  });
}

export function planNextForwardBarRequest(session) {
  const normalized = createReplaySession(session);
  const tfSeconds = getTimeframeSeconds(normalized.timeframe);
  const nextTs = normalized.cursor + tfSeconds;
  return makeChunkRequest({
    session: normalized,
    reason: REPLAY_SESSION_CHUNK_REASONS.NEXT_FORWARD_BAR,
    startTs: normalized.cursor,
    endTs: nextTs,
  });
}

export function addReplaySessionChunk(session, chunk) {
  const normalized = createReplaySession(session);
  const nextChunk = normalizeChunk(chunk, normalized.loadedChunks.length);
  if (!nextChunk) return normalized;
  const duplicate = normalized.loadedChunks.some((item) => (
    item.reason === nextChunk.reason &&
    item.startTs === nextChunk.startTs &&
    item.endTs === nextChunk.endTs
  ));
  const loadedChunks = duplicate ? normalized.loadedChunks : [...normalized.loadedChunks, nextChunk];
  const dataEarliestTimestamp = loadedChunks.reduce(
    (minTs, item) => Math.min(minTs, item.startTs),
    loadedChunks[0]?.startTs ?? null
  );
  const dataLatestLoadedTimestamp = loadedChunks.reduce(
    (maxTs, item) => Math.max(maxTs, item.endTs),
    loadedChunks[0]?.endTs ?? null
  );
  return {
    ...normalized,
    loadedChunks,
    dataEarliestTimestamp,
    dataLatestLoadedTimestamp,
  };
}
