import * as bus from '../event-bus.js';
import {
  getComparisonWindowState,
  setComparisonWindowEnabled,
  updateComparisonViewDescriptor,
} from './comparison-window-store.js';
import {
  COMPARISON_LAYOUT_MODE,
  COMPARISON_OVERLAY_SYNC_MODE,
  COMPARISON_SYNC_MODE,
  createComparisonViewDescriptor,
  normalizeVisibleWindow,
} from './comparison-view-contract.js';

const STORAGE_KEY = 'v4:comparison-window:workspace';
const SAVE_DEBOUNCE_MS = 150;

let saveTimer = null;

function getWindowObject() {
  return typeof window !== 'undefined' ? window : null;
}

function getStorage() {
  try {
    return getWindowObject()?.localStorage || null;
  } catch (e) {
    return null;
  }
}

function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeInstrument(value, fallback = 'ES') {
  return normalizeString(value, fallback).toUpperCase();
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeSyncMode(value) {
  const normalized = normalizeString(value, COMPARISON_SYNC_MODE.primaryTime);
  return Object.values(COMPARISON_SYNC_MODE).includes(normalized)
    ? normalized
    : COMPARISON_SYNC_MODE.primaryTime;
}

function normalizeOverlaySyncMode(value) {
  const normalized = normalizeString(value, COMPARISON_OVERLAY_SYNC_MODE.sync);
  if (normalized === 'local') return COMPARISON_OVERLAY_SYNC_MODE.noSync;
  return Object.values(COMPARISON_OVERLAY_SYNC_MODE).includes(normalized)
    ? normalized
    : COMPARISON_OVERLAY_SYNC_MODE.sync;
}

function normalizeLayoutMode(value) {
  return COMPARISON_LAYOUT_MODE.sliding;
}

function normalizeRange(range = null) {
  if (!range) return null;
  const startTs = normalizeNumber(range.startTs ?? range.start, null);
  const endTs = normalizeNumber(range.endTs ?? range.end, null);
  if (startTs === null || endTs === null) return null;
  return { startTs, endTs };
}

export function serializeComparisonWorkspaceState(state = getComparisonWindowState()) {
  const descriptor = state?.descriptor || createComparisonViewDescriptor();
  const isSlidingDescriptor = descriptor.layoutMode === COMPARISON_LAYOUT_MODE.sliding;
  return {
    enabled: Boolean(state?.enabled),
    descriptor: {
      viewId: normalizeString(descriptor.viewId, 'comparison-window-1'),
      instrument: normalizeInstrument(descriptor.instrument),
      timeframe: normalizeNumber(descriptor.timeframe, 60),
      syncMode: normalizeSyncMode(descriptor.syncMode),
      overlaySyncMode: normalizeOverlaySyncMode(descriptor.overlaySyncMode),
      layoutMode: normalizeLayoutMode(descriptor.layoutMode),
      visibleWindow: isSlidingDescriptor
        ? normalizeVisibleWindow(descriptor.visibleWindow)
        : normalizeVisibleWindow(createComparisonViewDescriptor().visibleWindow),
    },
    lastViewState: {
      requestedRange: normalizeRange(state?.requestedRange || state?.lastViewState?.requestedRange),
    },
  };
}

export function readComparisonWorkspaceState() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    return parsed ? serializeComparisonWorkspaceState(parsed) : null;
  } catch (e) {
    return null;
  }
}

export function saveComparisonWorkspaceState() {
  const storage = getStorage();
  if (!storage) return null;
  const snapshot = serializeComparisonWorkspaceState();
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export function restoreComparisonWorkspaceState(snapshot = readComparisonWorkspaceState()) {
  if (!snapshot) return null;
  const normalized = serializeComparisonWorkspaceState(snapshot);
  updateComparisonViewDescriptor(normalized.descriptor);
  setComparisonWindowEnabled(normalized.enabled);
  return normalized;
}

export function flushComparisonWorkspaceState() {
  if (saveTimer) {
    getWindowObject()?.clearTimeout(saveTimer);
    saveTimer = null;
  }
  return saveComparisonWorkspaceState();
}

function scheduleComparisonWorkspaceSave() {
  const win = getWindowObject();
  if (!win) {
    saveComparisonWorkspaceState();
    return;
  }
  if (saveTimer) win.clearTimeout(saveTimer);
  saveTimer = win.setTimeout(() => {
    saveTimer = null;
    saveComparisonWorkspaceState();
  }, SAVE_DEBOUNCE_MS);
}

export function initComparisonWindowPersistence() {
  restoreComparisonWorkspaceState();
  bus.on('comparison-window:changed', scheduleComparisonWorkspaceSave);
  bus.on('comparison-bars:loaded', scheduleComparisonWorkspaceSave);
  bus.on('comparison-bars:cleared', scheduleComparisonWorkspaceSave);
  getWindowObject()?.addEventListener('beforeunload', flushComparisonWorkspaceState);
}

export function getComparisonWorkspaceStorageKey() {
  return STORAGE_KEY;
}
