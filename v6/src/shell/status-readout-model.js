function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(2) : '--';
}

function formatTime(value) {
  if (!value) return 'pending';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'pending';
  return date.toISOString().slice(11, 16);
}

function formatTimestamp(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return 'pending';
  return formatTime(timestamp * 1000);
}

function normalizeReplayState(replayState = {}) {
  return {
    cursorTime: replayState.cursorTime || null,
    endTime: replayState.endTime || null,
    revealedCount: Number(replayState.revealedCount || 0),
    sessionId: replayState.sessionId || null,
    startTime: replayState.startTime || null,
    status: replayState.status || 'idle',
    symbol: replayState.symbol || 'NQ',
    timeframe: replayState.timeframe || '1m',
    totalBars: Number(replayState.totalBars || 0),
  };
}

function latestBarFromPayload(payload = {}) {
  return payload.state?.latestBar || payload.chartRecord?.bars?.at?.(-1) || null;
}

export function createStatusReadoutState({
  latestBar = null,
  playback = 'idle',
  replayState = {},
} = {}) {
  const replay = normalizeReplayState(replayState);
  const bar = latestBar ? { ...latestBar } : null;
  const revealedCount = Number.isFinite(replay.revealedCount) ? replay.revealedCount : 0;
  const totalBars = Number.isFinite(replay.totalBars) ? replay.totalBars : 0;
  const remaining = Math.max(0, totalBars - revealedCount);

  return Object.freeze({
    footer: Object.freeze({
      cursor: `Cursor ${formatTime(replay.cursorTime)}`,
      end: `End ${formatTime(replay.endTime)}`,
      noFuture: totalBars > 0 ? `No future ${remaining} hidden` : 'No future pending',
      playback: `Playback ${playback || replay.status || 'idle'}`,
      revealed: `Revealed ${revealedCount}/${totalBars || '--'}`,
      session: replay.sessionId ? `Session ${replay.sessionId}` : 'Session pending',
      start: `Start ${formatTime(replay.startTime)}`,
    }),
    latestBar: bar ? Object.freeze(bar) : null,
    ohlc: Object.freeze({
      close: `C ${formatPrice(bar?.close)}`,
      high: `H ${formatPrice(bar?.high)}`,
      low: `L ${formatPrice(bar?.low)}`,
      open: `O ${formatPrice(bar?.open)}`,
    }),
    playback: playback || replay.status || 'idle',
    replay,
    symbol: replay.symbol,
    timeframe: replay.timeframe,
    title: `${replay.symbol} ${replay.timeframe}`,
    timestamp: formatTimestamp(bar?.timestamp),
  });
}

export function statusReadoutStateFromDefaultWallPayload(payload = {}, previousState = createStatusReadoutState()) {
  return createStatusReadoutState({
    latestBar: latestBarFromPayload(payload) || previousState.latestBar,
    playback: payload.replayState?.status || previousState.playback,
    replayState: payload.replayState || previousState.replay,
  });
}

export function statusReadoutStateFromReplayPayload(payload = {}, previousState = createStatusReadoutState()) {
  return createStatusReadoutState({
    latestBar: previousState.latestBar,
    playback: payload.status || previousState.playback,
    replayState: {
      ...previousState.replay,
      ...payload,
    },
  });
}
