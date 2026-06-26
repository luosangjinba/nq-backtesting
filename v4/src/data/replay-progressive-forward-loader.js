import * as bus from '../event-bus.js';
import * as store from './bar-store.js';
import { getPrimaryInstrument } from './primary-instrument-store.js';
import { loadBarsWindow } from './load-bars-window.js';
import {
  formatReplayTimestamp,
  normalizeReplayOuterRange,
  parseReplayDateTime,
} from './replay-range-model.js';
import { recordReplayPerformanceEvent } from './replay-performance-diagnostics.js';

const EDGE_THRESHOLD_BARS = 24;
const FORWARD_CHUNK_SECONDS = 2 * 60 * 60;

let loading = false;
let lastRequestedKey = '';

function getOuterRange() {
  const outerRange = store.getRequestedOuterRange();
  return outerRange ? normalizeReplayOuterRange(outerRange) : null;
}

export function resolveReplayForwardWindow(currentEnd, outerRange, chunkSeconds = FORWARD_CHUNK_SECONDS) {
  const startTs = parseReplayDateTime(currentEnd);
  const outer = getOuterRange() || normalizeReplayOuterRange(outerRange);
  const seconds = Math.max(60, Math.floor(Number(chunkSeconds) || FORWARD_CHUNK_SECONDS));
  if (!Number.isFinite(startTs) || !outer) return null;
  if (startTs >= outer.endTs) return null;
  const endTs = Math.min(outer.endTs, startTs + seconds);
  if (endTs <= startTs) return null;
  return {
    start: formatReplayTimestamp(startTs),
    end: formatReplayTimestamp(endTs),
    startTs,
    endTs,
    timeframe: 1,
  };
}

function isReplayForwardLoadEligible(replayState = {}) {
  if (loading) return false;
  if (!replayState.enabled || replayState.cursorIndex < 0) return false;
  if (Number(store.getCurrentTimeframe()) !== 1) return false;
  if (!getOuterRange()) return false;
  const remaining = Number(replayState.dataCount) - Number(replayState.cursorIndex) - 1;
  return Number.isFinite(remaining) && remaining <= EDGE_THRESHOLD_BARS;
}

export async function loadReplayForwardChunk({
  instrument = getPrimaryInstrument(),
  loadWindow = loadBarsWindow,
  chunkSeconds = FORWARD_CHUNK_SECONDS,
} = {}) {
  const startedAt = performance.now();
  const currentRange = store.getCurrentRange();
  const forwardWindow = resolveReplayForwardWindow(currentRange.end, store.getRequestedOuterRange(), chunkSeconds);
  if (!forwardWindow) {
    return { ok: false, message: 'Replay forward load skipped: no forward window' };
  }

  const requestKey = `${instrument}|${forwardWindow.timeframe}|${forwardWindow.start}|${forwardWindow.end}`;
  if (loading || requestKey === lastRequestedKey) {
    return { ok: false, message: 'Replay forward load already pending' };
  }

  loading = true;
  lastRequestedKey = requestKey;
  try {
    const { result, cacheHit } = await loadWindow(
      forwardWindow.start,
      forwardWindow.end,
      forwardWindow.timeframe,
      instrument
    );
    const bars = Array.isArray(result?.bars) ? result.bars : [];
    const append = store.appendBarsToCurrentRange(bars, forwardWindow.end, { instrument });
    recordReplayPerformanceEvent('replay-forward:chunk', {
      instrument,
      start: forwardWindow.start,
      end: forwardWindow.end,
      barsCount: bars.length,
      addedBars: append.addedBars,
      cacheHit: Boolean(cacheHit),
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    });
    return {
      ok: true,
      cacheHit: Boolean(cacheHit),
      forwardWindow,
      bars,
      addedBars: append.addedBars,
    };
  } finally {
    loading = false;
  }
}

async function maybeLoadReplayForward(replayState = {}) {
  if (!isReplayForwardLoadEligible(replayState)) return;
  const wasPlaying = Boolean(replayState.isPlaying);
  try {
    const result = await loadReplayForwardChunk();
    if (!result.ok) return;
    bus.emit('status:update', {
      text: result.addedBars > 0
        ? `Replay forward loaded ${result.addedBars} bars${result.cacheHit ? ' (cache)' : ''}`
        : `Replay forward checked ${result.forwardWindow.start} - ${result.forwardWindow.end}${result.cacheHit ? ' (cache)' : ''}`,
      isError: false,
    });
    if (wasPlaying) {
      bus.emit('replay:resume-playback', { speedIndex: replayState.speedIndex });
    }
  } catch (err) {
    bus.emit('status:update', { text: `Replay forward load failed: ${err.message}`, isError: true });
  }
}

export function initReplayProgressiveForwardLoader() {
  bus.on('replay:changed', maybeLoadReplayForward);
}

export function resetReplayProgressiveForwardLoaderForTests() {
  loading = false;
  lastRequestedKey = '';
}
