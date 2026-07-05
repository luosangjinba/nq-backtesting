const DEFAULT_SESSION_INPUT = Object.freeze({
  endTime: '2026-06-05T16:00:00.000Z',
  profileId: 'default-profile',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
  workspaceId: 'default-workspace',
});

let nextSessionSequence = 1;

function normalizeText(value, fallback, fieldName) {
  const normalized = String(value || fallback || '').trim();
  if (!normalized) {
    throw new Error(`Session ${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeIsoTime(value, fallback, fieldName) {
  const normalized = normalizeText(value, fallback, fieldName);
  const date = new Date(normalized);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Session ${fieldName} must be a valid date/time.`);
  }
  return date.toISOString();
}

function createSessionId() {
  const sequence = String(nextSessionSequence).padStart(4, '0');
  nextSessionSequence += 1;
  return `v6-session-${sequence}`;
}

export function createReplaySession(input = {}) {
  const startTime = normalizeIsoTime(input.startTime, DEFAULT_SESSION_INPUT.startTime, 'startTime');
  const endTime = normalizeIsoTime(input.endTime, DEFAULT_SESSION_INPUT.endTime, 'endTime');
  if (new Date(startTime).valueOf() >= new Date(endTime).valueOf()) {
    throw new Error('Session startTime must be before endTime.');
  }

  const session = {
    createdAt: normalizeIsoTime(input.createdAt, new Date().toISOString(), 'createdAt'),
    endTime,
    id: normalizeText(input.id, createSessionId(), 'id'),
    profileId: normalizeText(input.profileId, DEFAULT_SESSION_INPUT.profileId, 'profileId'),
    startTime,
    status: 'created',
    symbol: normalizeText(input.symbol, DEFAULT_SESSION_INPUT.symbol, 'symbol'),
    timeframe: normalizeText(input.timeframe, DEFAULT_SESSION_INPUT.timeframe, 'timeframe'),
    workspaceId: normalizeText(input.workspaceId, DEFAULT_SESSION_INPUT.workspaceId, 'workspaceId'),
  };

  return Object.freeze(session);
}

export function getDefaultSessionInput() {
  return { ...DEFAULT_SESSION_INPUT };
}

export function resetSessionIdsForTest() {
  nextSessionSequence = 1;
}
