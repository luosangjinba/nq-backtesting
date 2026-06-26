import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from './bar-store.js';
import { getPrimaryInstrument } from './primary-instrument-store.js';
import { loadBarsWindow } from './load-bars-window.js';
import { formatReplayTimestamp, parseReplayDateTime } from './replay-range-model.js';
import { recordReplayPerformanceEvent } from './replay-performance-diagnostics.js';
import { getReplayCursorTimestamp } from '../ui/replay-controls.js';

const EDGE_THRESHOLD_BARS = 12;
const PREFIX_CHUNK_SECONDS = 2 * 60 * 60;
const CHUNK_BARS = 120;

function getChunkSeconds(chunkSeconds = PREFIX_CHUNK_SECONDS) {
  const timeframeSeconds = Math.max(60, Number(store.getCurrentTimeframe()) * 60);
  return Math.max(60, Math.floor(Number(chunkSeconds) || PREFIX_CHUNK_SECONDS), timeframeSeconds * CHUNK_BARS);
}

let loading = false;
let lastRequestedKey = '';
let pendingTimer = null;

function isReplayPrefixLoadEligible(visibleRange) {
  if (!visibleRange || loading) return false;
  if (!store.getRequestedOuterRange()) return false;
  if (getReplayCursorTimestamp() === null) return false;
  return Number(visibleRange.from) <= EDGE_THRESHOLD_BARS;
}

export function resolveReplayPrefixWindow(currentStart, chunkSeconds = PREFIX_CHUNK_SECONDS) {
  const endTs = parseReplayDateTime(currentStart);
  const timeframe = Number(store.getCurrentTimeframe()) || 1;
  const seconds = getChunkSeconds(chunkSeconds);
  if (!Number.isFinite(endTs)) return null;
  const startTs = endTs - seconds;
  return {
    start: formatReplayTimestamp(startTs),
    end: formatReplayTimestamp(endTs),
    startTs,
    endTs,
    timeframe,
  };
}

export async function loadReplayPrefixChunk({
  instrument = getPrimaryInstrument(),
  loadWindow = loadBarsWindow,
  chunkSeconds = PREFIX_CHUNK_SECONDS,
} = {}) {
  const startedAt = performance.now();
  const currentRange = store.getCurrentRange();
  const prefixWindow = resolveReplayPrefixWindow(currentRange.start, chunkSeconds);
  if (!prefixWindow) {
    return { ok: false, message: 'Replay prefix load skipped: invalid current range' };
  }

  const requestKey = `${instrument}|${prefixWindow.timeframe}|${prefixWindow.start}|${prefixWindow.end}`;
  if (loading || requestKey === lastRequestedKey) {
    return { ok: false, message: 'Replay prefix load already pending' };
  }

  loading = true;
  lastRequestedKey = requestKey;
  try {
    const { result, cacheHit } = await loadWindow(
      prefixWindow.start,
      prefixWindow.end,
      prefixWindow.timeframe,
      instrument
    );
    const bars = Array.isArray(result?.bars) ? result.bars : [];
    const prepend = store.prependBarsToCurrentRange(bars, prefixWindow.start, { instrument });
    recordReplayPerformanceEvent('replay-prefix:chunk', {
      instrument,
      start: prefixWindow.start,
      end: prefixWindow.end,
      barsCount: bars.length,
      addedBars: prepend.addedBars,
      cacheHit: Boolean(cacheHit),
      durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
    });
    return {
      ok: true,
      cacheHit: Boolean(cacheHit),
      prefixWindow,
      bars,
      addedBars: prepend.addedBars,
    };
  } finally {
    loading = false;
  }
}

async function maybeLoadReplayPrefix(visibleRange) {
  if (!isReplayPrefixLoadEligible(visibleRange)) return;
  try {
    const result = await loadReplayPrefixChunk();
    if (!result.ok) return;
    bus.emit('status:update', {
      text: result.addedBars > 0
        ? `Replay prefix loaded ${result.addedBars} bars${result.cacheHit ? ' (cache)' : ''}`
        : `Replay prefix checked ${result.prefixWindow.start} - ${result.prefixWindow.end}${result.cacheHit ? ' (cache)' : ''}`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', { text: `Replay prefix load failed: ${err.message}`, isError: true });
  }
}

function schedulePrefixLoad(visibleRange) {
  if (!isReplayPrefixLoadEligible(visibleRange)) return;
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    maybeLoadReplayPrefix(chart.getVisibleLogicalRange());
  }, 120);
}

export function initReplayProgressivePrefixLoader() {
  chart.subscribeVisibleLogicalRangeChange(schedulePrefixLoad);
}

export function resetReplayProgressivePrefixLoaderForTests() {
  loading = false;
  lastRequestedKey = '';
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}
