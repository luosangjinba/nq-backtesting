import { planCanvasLeftOlderWindow } from '../bar-data/bar-window.js';

function normalizeTimeframeMinutes(value, fieldName = 'timeframe') {
  const match = String(value || '').trim().match(/^(\d+)(m)?$/i);
  if (!match) {
    throw new Error(`Leftward history ${fieldName} must be minute-based.`);
  }
  const normalized = Number(match[1]);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Leftward history ${fieldName} must be a positive minute value.`);
  }
  return normalized;
}

function normalizeInstrument(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    throw new Error('Leftward history extension requires an instrument.');
  }
  return normalized;
}

function normalizeVisibleFrom(visibleRange = {}) {
  const normalized = Number(visibleRange?.from);
  if (!Number.isFinite(normalized)) {
    throw new Error('Leftward history extension visible range must include finite from.');
  }
  return normalized;
}

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function oldestTimestamp(bars = []) {
  const sorted = cloneBars(bars)
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  const timestamp = Number(sorted[0]?.timestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Leftward history extension requires bars with finite timestamps.');
  }
  return timestamp;
}

export function planLeftwardSourceWindow({
  bars = [],
  displayTimeframe,
  instrument,
  sourceTimeframe,
  visibleRange,
} = {}) {
  const visibleFrom = normalizeVisibleFrom(visibleRange);
  const leftBoundaryIndex = Math.floor(visibleFrom);
  const source = normalizeTimeframeMinutes(sourceTimeframe, 'sourceTimeframe');
  const display = normalizeTimeframeMinutes(displayTimeframe ?? source, 'displayTimeframe');
  if (display < source || display % source !== 0) {
    throw new Error('Leftward history displayTimeframe must be a multiple of sourceTimeframe.');
  }
  if (leftBoundaryIndex >= 0) {
    return {
      leftBoundaryIndex,
      reason: 'canvas-left-inside-loaded-window',
      status: 'ignored',
    };
  }

  const oldestDisplayTimestamp = oldestTimestamp(bars);
  const canvasLeftTimestamp = oldestDisplayTimestamp + (leftBoundaryIndex * display * 60);
  const plannedWindow = planCanvasLeftOlderWindow({
    canvasLeftTimestamp,
    instrument: normalizeInstrument(instrument),
    oldestLoadedTimestamp: oldestDisplayTimestamp,
    timeframe: source,
  });
  if (plannedWindow.exhausted) {
    return {
      leftBoundaryIndex,
      plannedWindow,
      reason: plannedWindow.reason || 'history-exhausted',
      status: 'ignored',
    };
  }
  return {
    displayTimeframe: display,
    leftBoundaryIndex,
    oldestDisplayTimestamp,
    plannedWindow,
    sourceTimeframe: source,
    status: 'planned',
  };
}
