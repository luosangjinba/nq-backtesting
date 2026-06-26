import { loadBarsWindow } from './load-bars-window.js';
import { formatReplayTimestamp, parseReplayDateTime } from './replay-range-model.js';

const DAY_SECONDS = 24 * 60 * 60;

function floorDay(timestamp) {
  return Math.floor(Number(timestamp) / DAY_SECONDS) * DAY_SECONDS;
}

export function resolveReplayChunks(windowRange = {}, chunkSeconds = DAY_SECONDS) {
  const startTs = Number(windowRange.startTs ?? parseReplayDateTime(windowRange.start));
  const endTs = Number(windowRange.endTs ?? parseReplayDateTime(windowRange.end));
  const timeframe = Number(windowRange.timeframe) || 1;
  const size = Math.max(DAY_SECONDS, Number(chunkSeconds) || DAY_SECONDS);
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs < startTs) return [];

  const chunks = [];
  let cursor = floorDay(startTs);
  while (cursor <= endTs) {
    const chunkStartTs = Math.max(startTs, cursor);
    const chunkEndTs = Math.min(endTs, cursor + size);
    chunks.push({
      start: formatReplayTimestamp(chunkStartTs),
      end: formatReplayTimestamp(chunkEndTs),
      startTs: chunkStartTs,
      endTs: chunkEndTs,
      timeframe,
    });
    cursor += size;
  }
  return chunks;
}

export function mergeReplayChunkBars(results = []) {
  const byTimestamp = new Map();
  for (const result of results) {
    const bars = Array.isArray(result?.bars) ? result.bars : [];
    for (const bar of bars) {
      const timestamp = Number(bar?.timestamp);
      if (!Number.isFinite(timestamp)) continue;
      byTimestamp.set(timestamp, { ...bar });
    }
  }
  return [...byTimestamp.values()].sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export async function loadReplayWindowChunks({
  instrument,
  windowRange,
  chunkSeconds = DAY_SECONDS,
  loadWindow = loadBarsWindow,
} = {}) {
  const chunks = resolveReplayChunks(windowRange, chunkSeconds);
  const loaded = await Promise.all(
    chunks.map(async (chunk) => {
      const { result, cacheHit, cacheKey } = await loadWindow(chunk.start, chunk.end, chunk.timeframe, instrument);
      return {
        chunk,
        result,
        cacheHit,
        cacheKey,
      };
    })
  );
  return {
    chunks,
    loadedChunks: loaded.map(({ chunk, cacheHit, cacheKey }) => ({ ...chunk, cacheHit: Boolean(cacheHit), cacheKey })),
    bars: mergeReplayChunkBars(loaded.map(({ result }) => result)),
  };
}
