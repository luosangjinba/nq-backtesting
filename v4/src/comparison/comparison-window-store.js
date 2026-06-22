import * as bus from '../event-bus.js';
import { createComparisonViewDescriptor, normalizeVisibleWindow } from './comparison-view-contract.js';

const DEFAULT_DESCRIPTOR = createComparisonViewDescriptor();

let enabled = false;
let descriptor = createComparisonViewDescriptor();

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
  descriptor = {
    ...descriptor,
    ...patch,
    visibleWindow: normalizeVisibleWindow(patch.visibleWindow || descriptor.visibleWindow),
  };
  emitChanged();
  return getComparisonViewDescriptor();
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

function emitChanged() {
  bus.emit('comparison-window:changed', getComparisonWindowState());
}
