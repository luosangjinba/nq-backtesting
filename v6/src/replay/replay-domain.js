import {
  normalizeMinuteTimeframe,
  normalizeUnixMilliseconds,
  TIME_DOMAIN_CONSTANTS,
} from '../time-domain/time-domain.js';

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
    previousAvailable: boundedIndex > 0,
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

  const startMs = normalizeUnixMilliseconds(session.startTime, { fieldName: 'Replay startTime' });
  const endMs = normalizeUnixMilliseconds(session.endTime, { fieldName: 'Replay endTime' });
  if (startMs > endMs) {
    throw new Error('Replay startTime must be before or equal to endTime.');
  }

  const timeframeMinutes = normalizeMinuteTimeframe(session.timeframe, { fieldName: 'Replay timeframe' });
  const stepMs = timeframeMinutes * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
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
  const startMs = normalizeUnixMilliseconds(state.startTime, { fieldName: 'Replay startTime' });
  const endMs = normalizeUnixMilliseconds(state.endTime, { fieldName: 'Replay endTime' });
  const stepMs = normalizeMinuteTimeframe(state.timeframe, {
    fieldName: 'Replay timeframe',
  }) * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
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

export function previousReplayState(state) {
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
  const startMs = normalizeUnixMilliseconds(state.startTime, { fieldName: 'Replay startTime' });
  const endMs = normalizeUnixMilliseconds(state.endTime, { fieldName: 'Replay endTime' });
  const stepMs = normalizeMinuteTimeframe(state.timeframe, {
    fieldName: 'Replay timeframe',
  }) * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  return buildState({
    cursorIndex: state.cursorIndex - 1,
    endMs,
    session,
    startMs,
    status: 'ready',
    stepMs,
    totalBars: state.totalBars,
  });
}

export function resolvePreviousReplayAvailability(state = {}) {
  if (typeof state.previousAvailable === 'boolean') {
    return state.previousAvailable;
  }
  const cursorIndex = Number(state.cursorIndex);
  if (Number.isFinite(cursorIndex)) {
    return cursorIndex > 0;
  }
  const revealedCount = Number(state.revealedCount);
  return Number.isFinite(revealedCount) && revealedCount > 1;
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

export function setReplayCursorTime(state, cursorTime) {
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
  const startMs = normalizeUnixMilliseconds(state.startTime, { fieldName: 'Replay startTime' });
  const endMs = normalizeUnixMilliseconds(state.endTime, { fieldName: 'Replay endTime' });
  const cursorMs = normalizeUnixMilliseconds(cursorTime, { fieldName: 'Replay cursorTime' });
  const stepMs = normalizeMinuteTimeframe(state.timeframe, {
    fieldName: 'Replay timeframe',
  }) * TIME_DOMAIN_CONSTANTS.MINUTE_MS;
  const boundedCursorMs = Math.min(Math.max(cursorMs, startMs), endMs);
  const cursorIndex = Math.min(
    Math.max(Math.floor((boundedCursorMs - startMs) / stepMs), 0),
    state.totalBars - 1,
  );
  const ended = boundedCursorMs >= endMs;
  return Object.freeze({
    ...state,
    cursorIndex,
    cursorTime: toIso(boundedCursorMs),
    endTime: session.endTime,
    previousAvailable: cursorIndex > 0,
    revealedCount: cursorIndex + 1,
    sessionId: session.id,
    startTime: session.startTime,
    status: ended && state.status !== 'paused' ? 'ended' : state.status,
    symbol: session.symbol,
    timeframe: session.timeframe,
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
