import { normalizeBar, normalizeBars } from '../bar-data/bar-normalizer.js';
import { normalizeUnixSeconds } from '../time-domain/time-domain.js';

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Chart data paneId must be a non-empty string.');
  }
  return normalized;
}

function normalizeCursorTimestamp(cursorTimestamp) {
  if (cursorTimestamp === null || cursorTimestamp === undefined) {
    return null;
  }
  const timestamp = Number(cursorTimestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Chart data cursorTimestamp must be finite.');
  }
  normalizeUnixSeconds(timestamp, {
    fieldName: 'Chart data cursorTimestamp',
  });
  return timestamp;
}

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

export function filterNoFutureBars(bars = [], cursorTimestamp = null) {
  const normalizedCursor = normalizeCursorTimestamp(cursorTimestamp);
  const normalizedBars = normalizeBars(bars);
  if (normalizedCursor === null) {
    return normalizedBars;
  }
  return normalizedBars.filter((bar) => bar.timestamp <= normalizedCursor);
}

function mergeOrderedBars(bars = []) {
  const barsByTimestamp = new Map();
  bars
    .map(normalizeBar)
    .sort((left, right) => left.timestamp - right.timestamp)
    .forEach((bar) => {
      const existing = barsByTimestamp.get(bar.timestamp);
      barsByTimestamp.set(
        bar.timestamp,
        existing ? {
          close: bar.close,
          high: Math.max(existing.high, bar.high),
          low: Math.min(existing.low, bar.low),
          open: existing.open,
          time: existing.time,
          timestamp: existing.timestamp,
          ...(Number.isFinite(Number(bar.volume)) || Number.isFinite(Number(existing.volume))
            ? { volume: (Number(existing.volume) || 0) + (Number(bar.volume) || 0) }
            : {}),
        } : bar,
      );
    });
  return [...barsByTimestamp.values()];
}

export function mergeChartBars(existingBars = [], appendedBars = [], cursorTimestamp = null) {
  const normalizedCursor = normalizeCursorTimestamp(cursorTimestamp);
  const mergedBars = mergeOrderedBars([
    ...cloneBars(existingBars),
    ...appendedBars.map(normalizeBar),
  ]);
  if (normalizedCursor === null) {
    return mergedBars;
  }
  return mergedBars.filter((bar) => bar.timestamp <= normalizedCursor);
}

export function createEmptyChartBarsRecord(paneId) {
  return Object.freeze({
    bars: [],
    paneId: normalizePaneId(paneId),
    revision: 0,
  });
}

export function createChartBarsRecord({
  bars = [],
  cursorTimestamp = null,
  paneId,
  revision = 0,
} = {}) {
  const normalizedRevision = Number(revision);
  if (!Number.isInteger(normalizedRevision) || normalizedRevision < 0) {
    throw new Error('Chart data revision must be a non-negative integer.');
  }
  return Object.freeze({
    bars: cloneBars(filterNoFutureBars(bars, cursorTimestamp)),
    paneId: normalizePaneId(paneId),
    revision: normalizedRevision,
  });
}

export function cloneChartBarsRecord(record) {
  return {
    bars: cloneBars(record?.bars || []),
    paneId: record?.paneId || '',
    revision: Number(record?.revision || 0),
  };
}
