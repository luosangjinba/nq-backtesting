const MINUTE_MS = 60_000;

function parseIsoMs(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Replay ${fieldName} must be a valid date/time.`);
  }
  return date.valueOf();
}

function normalizeTimeframeMinutes(timeframe) {
  const match = String(timeframe || '').trim().match(/^(\d+)(m)?$/i);
  if (!match) {
    throw new Error('Replay timeframe must be minute-based.');
  }
  const minutes = Number(match[1]);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error('Replay timeframe must be a positive minute value.');
  }
  return minutes;
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function buildState({
  cursorIndex,
  endMs,
  session,
  startMs,
  status,
  stepMs,
  totalBars,
}) {
  const boundedIndex = Math.min(Math.max(cursorIndex, 0), totalBars - 1);
  const cursorMs = Math.min(startMs + (boundedIndex * stepMs), endMs);
  const ended = boundedIndex >= totalBars - 1;

  return Object.freeze({
    cursorIndex: boundedIndex,
    cursorTime: toIso(cursorMs),
    endTime: toIso(endMs),
    revealedCount: boundedIndex + 1,
    sessionId: session.id,
    startTime: toIso(startMs),
    status: ended && status !== 'paused' ? 'ended' : status,
    symbol: session.symbol,
    timeframe: session.timeframe,
    totalBars,
  });
}

export function createReplayStateFromSession(session) {
  if (!session?.id) {
    throw new Error('Replay session is required.');
  }

  const startMs = parseIsoMs(session.startTime, 'startTime');
  const endMs = parseIsoMs(session.endTime, 'endTime');
  if (startMs > endMs) {
    throw new Error('Replay startTime must be before or equal to endTime.');
  }

  const timeframeMinutes = normalizeTimeframeMinutes(session.timeframe);
  const stepMs = timeframeMinutes * MINUTE_MS;
  const totalBars = Math.floor((endMs - startMs) / stepMs) + 1;

  return buildState({
    cursorIndex: 0,
    endMs,
    session,
    startMs,
    status: totalBars <= 1 ? 'ended' : 'ready',
    stepMs,
    totalBars,
  });
}

export function nextReplayState(state) {
  if (!state) {
    throw new Error('Replay state is required.');
  }

  const session = {
    endTime: state.endTime,
    id: state.sessionId,
    startTime: state.startTime,
    symbol: state.symbol,
    timeframe: state.timeframe,
  };
  const startMs = parseIsoMs(state.startTime, 'startTime');
  const endMs = parseIsoMs(state.endTime, 'endTime');
  const stepMs = normalizeTimeframeMinutes(state.timeframe) * MINUTE_MS;
  return buildState({
    cursorIndex: state.cursorIndex + 1,
    endMs,
    session,
    startMs,
    status: 'ready',
    stepMs,
    totalBars: state.totalBars,
  });
}

export function resetReplayState(state) {
  if (!state) {
    throw new Error('Replay state is required.');
  }
  return createReplayStateFromSession({
    endTime: state.endTime,
    id: state.sessionId,
    startTime: state.startTime,
    symbol: state.symbol,
    timeframe: state.timeframe,
  });
}

export function markReplayPlaying(state) {
  if (!state) {
    throw new Error('Replay state is required.');
  }
  if (state.status === 'ended') return state;
  return Object.freeze({
    ...state,
    status: 'playing',
  });
}

export function markReplayPaused(state) {
  if (!state) {
    throw new Error('Replay state is required.');
  }
  if (state.status === 'ended') return state;
  return Object.freeze({
    ...state,
    status: 'paused',
  });
}
