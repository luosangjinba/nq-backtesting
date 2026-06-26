import {
  clampReplayCursor,
  normalizeReplayOuterRange,
} from './replay-range-model.js';
import { loadReplayWindowChunks } from './replay-chunk-loader.js';
import { resolveReplayWindowAroundCursor } from './replay-window-policy.js';

function resolveActivationTimestamp(cursorTimestamp, bars = []) {
  const cursor = Number(cursorTimestamp);
  const firstTimestamp = Number(bars[0]?.timestamp);
  if (!Number.isFinite(firstTimestamp)) return Number.isFinite(cursor) ? cursor : null;
  if (!Number.isFinite(cursor) || cursor < firstTimestamp) return firstTimestamp;
  return cursor;
}

export async function loadReplayFirstWindow({
  start,
  end,
  timeframe = 1,
  instrument,
  cursorTimestamp = null,
  loadWindow,
} = {}) {
  const outerRange = normalizeReplayOuterRange({ start, end, timeframe });
  if (!outerRange) {
    return {
      ok: false,
      message: 'Invalid replay range',
      outerRange: null,
      windowRange: null,
      bars: [],
      loadedChunks: [],
      activationTimestamp: null,
    };
  }

  const cursor = clampReplayCursor(cursorTimestamp, outerRange);
  const resolved = resolveReplayWindowAroundCursor(outerRange, cursor);
  if (!resolved.ok) {
    return {
      ok: false,
      message: resolved.message,
      outerRange,
      windowRange: null,
      bars: [],
      loadedChunks: [],
      activationTimestamp: null,
    };
  }

  const loaded = await loadReplayWindowChunks({
    instrument,
    windowRange: resolved.windowRange,
    loadWindow,
  });
  const activationTimestamp = resolveActivationTimestamp(resolved.cursorTimestamp, loaded.bars);

  return {
    ok: true,
    message: resolved.message,
    outerRange,
    cursorTimestamp: resolved.cursorTimestamp,
    windowRange: resolved.windowRange,
    bars: loaded.bars,
    chunks: loaded.chunks,
    loadedChunks: loaded.loadedChunks,
    activationTimestamp,
  };
}
