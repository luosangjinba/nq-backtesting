// State for the readonly split-screen secondary chart.

import * as bus from '../event-bus.js';

const DEFAULT_SECONDARY_TIMEFRAME = 5;

let enabled = false;
let bars = [];
let currentStart = null;
let currentEnd = null;
let currentTimeframe = DEFAULT_SECONDARY_TIMEFRAME;
let requestedRange = null;

function emitSettingsChanged() {
  bus.emit('secondary-chart:settings-changed', {
    enabled,
    timeframe: currentTimeframe,
  });
}

export function setSecondaryEnabled(nextEnabled) {
  const normalized = Boolean(nextEnabled);
  if (enabled === normalized) return;
  enabled = normalized;
  emitSettingsChanged();
}

export function isSecondaryEnabled() {
  return enabled;
}

export function setSecondaryTimeframe(tf) {
  const parsed = Number(tf);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  if (currentTimeframe === parsed) return;
  currentTimeframe = parsed;
  emitSettingsChanged();
}

export function getSecondaryTimeframe() {
  return currentTimeframe;
}

export function setSecondaryBars(newBars, start, end, tf = currentTimeframe, range = null) {
  const parsedTimeframe = Number(tf);
  bars = Array.isArray(newBars) ? [...newBars] : [];
  currentStart = start;
  currentEnd = end;
  currentTimeframe = Number.isFinite(parsedTimeframe) && parsedTimeframe > 0 ? parsedTimeframe : currentTimeframe;
  requestedRange = range;
  bus.emit('secondary-bars:loaded', {
    bars: getSecondaryBars(),
    start,
    end,
    tf: currentTimeframe,
    requestedRange,
  });
}

export function getSecondaryBars() {
  return [...bars];
}

export function getSecondaryRequestedRange() {
  return requestedRange;
}

export function getSecondaryDisplayBars() {
  if (!requestedRange || bars.length === 0) return getSecondaryBars();
  const { startTs, endTs } = requestedRange;
  return bars.filter((bar) => bar.timestamp >= startTs && bar.timestamp <= endTs);
}

export function getSecondaryCurrentRange() {
  return { start: currentStart, end: currentEnd };
}

export function getSecondaryBarCount() {
  return bars.length;
}

export function clearSecondaryBars() {
  bars = [];
  currentStart = null;
  currentEnd = null;
  requestedRange = null;
  bus.emit('secondary-bars:cleared');
}

export function resetSecondaryChartState() {
  enabled = false;
  bars = [];
  currentStart = null;
  currentEnd = null;
  currentTimeframe = DEFAULT_SECONDARY_TIMEFRAME;
  requestedRange = null;
  bus.emit('secondary-chart:reset');
}
