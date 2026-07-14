import { formatChartTime } from '../time-domain/time-presentation.js';

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(2) : '--';
}

function formatTimestamp(value, timePresentation) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return 'pending';
  return formatChartTime(timestamp, timePresentation);
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

function replayLifecycle(status, totalBars) {
  if (!totalBars || status === 'idle') {
    return Object.freeze({ kind: 'preparing', message: 'Preparing replay…' });
  }
  if (['ready', 'playing', 'paused'].includes(status)) {
    return Object.freeze({ kind: 'ready', message: 'Replay ready' });
  }
  if (status === 'ended') {
    return Object.freeze({ kind: 'complete', message: 'Replay complete' });
  }
  return Object.freeze({ kind: 'unavailable', message: 'Replay unavailable' });
}

function latestBarFromPayload(payload = {}) {
  return payload.state?.latestBar || payload.chartRecord?.bars?.at?.(-1) || null;
}

function candleDirection(bar) {
  if (!bar) return 'empty';
  const open = Number(bar.open);
  const close = Number(bar.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return 'empty';
  if (close > open) return 'up';
  if (close < open) return 'down';
  return 'flat';
}

function formatBarChange(bar, previousClose) {
  const close = Number(bar?.close);
  const baseline = Number(previousClose);
  if (!Number.isFinite(close) || !Number.isFinite(baseline) || baseline === 0) {
    return Object.freeze({ absolute: '--', percent: '--', text: '--' });
  }
  const absolute = close - baseline;
  const percent = (absolute / baseline) * 100;
  const prefix = absolute > 0 ? '+' : '';
  const percentPrefix = percent > 0 ? '+' : '';
  return Object.freeze({
    absolute: `${prefix}${absolute.toFixed(2)}`,
    percent: `${percentPrefix}${percent.toFixed(2)}%`,
    text: `${prefix}${absolute.toFixed(2)} (${percentPrefix}${percent.toFixed(2)}%)`,
  });
}

export function createStatusReadoutState({
  crosshairBar = null,
  latestBar = null,
  playback = 'idle',
  previousClose = null,
  replayState = {},
  timePresentation = {},
} = {}) {
  const replay = normalizeReplayState(replayState);
  const bar = latestBar ? { ...latestBar } : null;
  const selectedBar = crosshairBar ? { ...crosshairBar } : null;
  const revealedCount = Number.isFinite(replay.revealedCount) ? replay.revealedCount : 0;
  const totalBars = Number.isFinite(replay.totalBars) ? replay.totalBars : 0;
  const remaining = Math.max(0, totalBars - revealedCount);
  const lifecycle = replayLifecycle(replay.status, totalBars);

  return Object.freeze({
    compactReplayStatus: Object.freeze({
      kind: lifecycle.kind,
      message: lifecycle.message,
      protectionMessage: 'Future data hidden',
      protectionVisible: totalBars > 0 && remaining > 0,
    }),
    replayDiagnostics: Object.freeze({
      version: 1,
      sessionId: replay.sessionId,
      startTime: replay.startTime,
      cursorTime: replay.cursorTime,
      endTime: replay.endTime,
      revealedCount,
      totalBars,
      hiddenCount: remaining,
      runtimeStatus: replay.status,
    }),
    candleDirection: candleDirection(selectedBar),
    barChange: formatBarChange(selectedBar, previousClose),
    crosshairBar: selectedBar ? Object.freeze(selectedBar) : null,
    latestBar: bar ? Object.freeze(bar) : null,
    ohlc: Object.freeze({
      close: `C ${formatPrice(selectedBar?.close)}`,
      high: `H ${formatPrice(selectedBar?.high)}`,
      low: `L ${formatPrice(selectedBar?.low)}`,
      open: `O ${formatPrice(selectedBar?.open)}`,
    }),
    playback: playback || replay.status || 'idle',
    replay,
    symbol: replay.symbol,
    timeframe: replay.timeframe,
    title: `${replay.symbol} ${replay.timeframe}`,
    timePresentation: Object.freeze({
      displayTimezone: ['utc', 'local'].includes(timePresentation.displayTimezone)
        ? timePresentation.displayTimezone
        : 'exchange',
      timeFormat: timePresentation.timeFormat === '12h' ? '12h' : '24h',
    }),
    timestamp: formatTimestamp(bar?.timestamp, timePresentation),
  });
}

export function statusReadoutStateFromDefaultWallPayload(payload = {}, previousState = createStatusReadoutState()) {
  return createStatusReadoutState({
    crosshairBar: previousState.crosshairBar,
    latestBar: latestBarFromPayload(payload) || previousState.latestBar,
    playback: payload.replayState?.status || previousState.playback,
    replayState: payload.replayState || previousState.replay,
    timePresentation: previousState.timePresentation,
  });
}

export function statusReadoutStateFromReplayPayload(payload = {}, previousState = createStatusReadoutState()) {
  return createStatusReadoutState({
    crosshairBar: previousState.crosshairBar,
    latestBar: previousState.latestBar,
    playback: payload.status || previousState.playback,
    replayState: {
      ...previousState.replay,
      ...payload,
    },
    timePresentation: previousState.timePresentation,
  });
}

export function statusReadoutStateFromChartDataPayload(payload = {}, previousState = createStatusReadoutState()) {
  return createStatusReadoutState({
    crosshairBar: previousState.crosshairBar,
    latestBar: payload.record?.bars?.at?.(-1) || previousState.latestBar,
    playback: previousState.playback,
    replayState: previousState.replay,
    timePresentation: previousState.timePresentation,
  });
}

export function statusReadoutStateFromCrosshairPayload(payload = {}, previousState = createStatusReadoutState()) {
  if (payload.displayReadout === false) {
    return previousState;
  }
  return createStatusReadoutState({
    crosshairBar: payload.bar || null,
    latestBar: previousState.latestBar,
    playback: previousState.playback,
    previousClose: payload.previousClose,
    replayState: previousState.replay,
    timePresentation: previousState.timePresentation,
  });
}

export function statusReadoutStateWithTimePresentation(previousState, timePresentation = {}) {
  return createStatusReadoutState({
    crosshairBar: previousState.crosshairBar,
    latestBar: previousState.latestBar,
    playback: previousState.playback,
    replayState: previousState.replay,
    timePresentation,
  });
}
