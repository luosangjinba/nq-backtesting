import { formatChartTime } from '../time-domain/time-presentation.js';

function formatPrice(value) {
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(2) : '--';
}

function formatTime(value, timePresentation) {
  if (!value) return 'pending';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'pending';
  return formatChartTime(date.valueOf() / 1000, timePresentation);
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

  return Object.freeze({
    footer: Object.freeze({
      cursor: `Cursor ${formatTime(replay.cursorTime, timePresentation)}`,
      end: `End ${formatTime(replay.endTime, timePresentation)}`,
      noFuture: totalBars > 0 ? `No future ${remaining} hidden` : 'No future pending',
      playback: `Playback ${playback || replay.status || 'idle'}`,
      revealed: `Revealed ${revealedCount}/${totalBars || '--'}`,
      session: replay.sessionId ? `Session ${replay.sessionId}` : 'Session pending',
      start: `Start ${formatTime(replay.startTime, timePresentation)}`,
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
