const DEFAULT_SESSION_INPUT = Object.freeze({
  accountBalance: 100000,
  autoUpdateEndDate: false,
  endTime: '2026-06-05T16:00:00.000Z',
  name: 'Backtesting session',
  profileId: 'default-profile',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  symbols: ['NQ'],
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

function normalizeAccountBalance(value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Session accountBalance must be a non-negative number.');
  }
  return parsed;
}

function normalizeSymbols(value, fallback) {
  const source = Array.isArray(value) ? value : [value || fallback];
  const symbols = source
    .flat()
    .map((symbol) => String(symbol || '').trim().toUpperCase())
    .filter(Boolean);
  const unique = [...new Set(symbols)];
  if (!unique.length) {
    throw new Error('Session symbols must include at least one symbol.');
  }
  return unique;
}

function createSessionId() {
  const sequence = String(nextSessionSequence).padStart(4, '0');
  nextSessionSequence += 1;
  return `v6-session-${sequence}`;
}

function parseGeneratedSessionSequence(id) {
  const match = String(id || '').trim().match(/^v6-session-(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function advanceSessionIdsAfterExistingSessions(sessions = []) {
  const maxSequence = sessions.reduce((maxValue, session) => {
    const sequence = parseGeneratedSessionSequence(session?.id);
    return Number.isFinite(sequence) ? Math.max(maxValue, sequence) : maxValue;
  }, 0);
  if (maxSequence >= nextSessionSequence) {
    nextSessionSequence = maxSequence + 1;
  }
  return nextSessionSequence;
}

export function createReplaySession(input = {}) {
  const startTime = normalizeIsoTime(input.startTime, DEFAULT_SESSION_INPUT.startTime, 'startTime');
  const endTime = normalizeIsoTime(input.endTime, DEFAULT_SESSION_INPUT.endTime, 'endTime');
  if (new Date(startTime).valueOf() >= new Date(endTime).valueOf()) {
    throw new Error('Session startTime must be before endTime.');
  }
  const symbols = normalizeSymbols(input.symbols || input.symbol, DEFAULT_SESSION_INPUT.symbol);

  const session = {
    createdAt: normalizeIsoTime(input.createdAt, new Date().toISOString(), 'createdAt'),
    accountBalance: normalizeAccountBalance(input.accountBalance, DEFAULT_SESSION_INPUT.accountBalance),
    autoUpdateEndDate: Boolean(input.autoUpdateEndDate),
    endTime,
    id: normalizeText(input.id, createSessionId(), 'id'),
    name: normalizeText(input.name, DEFAULT_SESSION_INPUT.name, 'name'),
    profileId: normalizeText(input.profileId, DEFAULT_SESSION_INPUT.profileId, 'profileId'),
    startTime,
    status: 'created',
    symbol: symbols[0],
    symbols,
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
