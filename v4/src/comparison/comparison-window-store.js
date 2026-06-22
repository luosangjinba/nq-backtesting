import * as bus from '../event-bus.js';
import {
  COMPARISON_LAYOUT_MODE,
  COMPARISON_OVERLAY_SYNC_MODE,
  createComparisonViewDescriptor,
  normalizeVisibleWindow,
} from './comparison-view-contract.js';

const DEFAULT_DESCRIPTOR = createComparisonViewDescriptor();

let enabled = false;
let descriptor = createComparisonViewDescriptor();
let bars = [];
let displayBars = [];
let requestedRange = null;
let currentStart = null;
let currentEnd = null;

export function isComparisonWindowEnabled() {
  return enabled;
}

export function getComparisonViewDescriptor() {
  return {
    ...descriptor,
    visibleWindow: { ...descriptor.visibleWindow },
  };
}

export function getComparisonWindowState() {
  return {
    enabled,
    descriptor: getComparisonViewDescriptor(),
    bars: getComparisonBars(),
    displayBars: getComparisonDisplayBars(),
    requestedRange,
  };
}

export function setComparisonWindowEnabled(nextEnabled) {
  const normalized = Boolean(nextEnabled);
  if (enabled === normalized) return getComparisonWindowState();
  enabled = normalized;
  emitChanged();
  return getComparisonWindowState();
}

export function updateComparisonViewDescriptor(patch = {}) {
  const requestedLayout = patch.layoutMode || descriptor.layoutMode;
  const layoutMode =
    requestedLayout === COMPARISON_LAYOUT_MODE.sliding
      ? COMPARISON_LAYOUT_MODE.sliding
      : DEFAULT_DESCRIPTOR.layoutMode;
  descriptor = {
    ...descriptor,
    ...patch,
    layoutMode,
    visibleWindow: normalizeVisibleWindow(patch.visibleWindow || descriptor.visibleWindow),
  };
  emitChanged();
  return getComparisonViewDescriptor();
}

export function setComparisonInstrument(instrument) {
  return updateComparisonViewDescriptor({ instrument });
}

export function setComparisonTimeframe(timeframe) {
  return updateComparisonViewDescriptor({ timeframe: Number(timeframe) || descriptor.timeframe });
}

export function setComparisonOverlaySyncMode(overlaySyncMode) {
  const requested = overlaySyncMode === 'local' ? COMPARISON_OVERLAY_SYNC_MODE.noSync : overlaySyncMode;
  const normalized = Object.values(COMPARISON_OVERLAY_SYNC_MODE).includes(requested)
    ? requested
    : COMPARISON_OVERLAY_SYNC_MODE.sync;
  return updateComparisonViewDescriptor({ overlaySyncMode: normalized });
}

export function updateComparisonVisibleWindow(visibleWindow) {
  descriptor = {
    ...descriptor,
    visibleWindow: normalizeVisibleWindow({
      ...descriptor.visibleWindow,
      ...visibleWindow,
    }),
  };
  emitChanged();
  return descriptor.visibleWindow;
}

export function resetComparisonVisibleWindow() {
  descriptor = {
    ...descriptor,
    visibleWindow: { ...DEFAULT_DESCRIPTOR.visibleWindow },
  };
  emitChanged();
  return descriptor.visibleWindow;
}

export function setComparisonBars(nextBars = [], range = null, options = {}) {
  bars = Array.isArray(nextBars) ? [...nextBars] : [];
  requestedRange = range || null;
  currentStart = options.start ?? currentStart;
  currentEnd = options.end ?? currentEnd;
  displayBars = deriveDisplayBars(bars, requestedRange);
  bus.emit('comparison-bars:loaded', {
    bars: getComparisonBars(),
    displayBars: getComparisonDisplayBars(),
    requestedRange,
    descriptor: getComparisonViewDescriptor(),
  });
}

export function clearComparisonBars() {
  bars = [];
  displayBars = [];
  requestedRange = null;
  currentStart = null;
  currentEnd = null;
  bus.emit('comparison-bars:cleared');
}

export function getComparisonBars() {
  return [...bars];
}

export function getComparisonDisplayBars() {
  return [...displayBars];
}

export function getComparisonCurrentRange() {
  return { start: currentStart, end: currentEnd };
}

function deriveDisplayBars(sourceBars, range) {
  if (!range || sourceBars.length === 0) return sourceBars;
  const { startTs, endTs } = range;
  return sourceBars.filter((bar) => Number(bar?.timestamp) >= startTs && Number(bar?.timestamp) <= endTs);
}

function emitChanged() {
  bus.emit('comparison-window:changed', getComparisonWindowState());
}
