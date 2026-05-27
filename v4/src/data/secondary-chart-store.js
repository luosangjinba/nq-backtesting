// State for the readonly split-screen secondary chart.

import * as bus from '../event-bus.js';
import { INSTRUMENT_OPTIONS } from '../config.js';

const DEFAULT_SECONDARY_TIMEFRAME = 60;
const DEFAULT_SECONDARY_INSTRUMENT = 'ES';
const DEFAULT_SPLIT_LAYOUT = 'stack';
const SPLIT_LAYOUTS = new Set(['stack', 'side']);
const SUPPORTED_INSTRUMENTS = new Set(INSTRUMENT_OPTIONS);

let enabled = false;
let layout = DEFAULT_SPLIT_LAYOUT;
let bars = [];
let currentStart = null;
let currentEnd = null;
let currentTimeframe = DEFAULT_SECONDARY_TIMEFRAME;
let currentInstrument = DEFAULT_SECONDARY_INSTRUMENT;
let requestedRange = null;

function emitSettingsChanged() {
  bus.emit('secondary-chart:settings-changed', {
    enabled,
    layout,
    timeframe: currentTimeframe,
    instrument: currentInstrument,
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

export function setSplitLayout(nextLayout) {
  const normalized = SPLIT_LAYOUTS.has(nextLayout) ? nextLayout : DEFAULT_SPLIT_LAYOUT;
  if (layout === normalized) return;
  layout = normalized;
  emitSettingsChanged();
}

export function getSplitLayout() {
  return layout;
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

export function setSecondaryInstrument(instrument) {
  const normalized = String(instrument || '').trim().toUpperCase();
  if (!SUPPORTED_INSTRUMENTS.has(normalized)) return;
  if (currentInstrument === normalized) return;
  currentInstrument = normalized;
  emitSettingsChanged();
}

export function getSecondaryInstrument() {
  return currentInstrument;
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
    instrument: currentInstrument,
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
  layout = DEFAULT_SPLIT_LAYOUT;
  bars = [];
  currentStart = null;
  currentEnd = null;
  currentTimeframe = DEFAULT_SECONDARY_TIMEFRAME;
  currentInstrument = DEFAULT_SECONDARY_INSTRUMENT;
  requestedRange = null;
  bus.emit('secondary-chart:reset');
}
