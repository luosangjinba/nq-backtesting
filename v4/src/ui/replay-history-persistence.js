import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { getComparisonWindowState } from '../comparison/comparison-window-store.js';
import { saveReplayHistoryItem } from './replay-history-store.js';

const SAVE_DEBOUNCE_MS = 800;

let lastReplayState = null;
let saveTimer = null;

function getWindowObject() {
  return typeof window !== 'undefined' ? window : null;
}

function clearSaveTimer() {
  if (!saveTimer) return;
  getWindowObject()?.clearTimeout(saveTimer);
  saveTimer = null;
}

function isValidReplayState(replayState) {
  return Boolean(
    replayState?.enabled &&
    Number.isFinite(Number(replayState.cursorTimestamp))
  );
}

export function createReplayHistoryCheckpoint(replayState = lastReplayState) {
  if (!isValidReplayState(replayState)) return null;

  const currentRange = store.getCurrentRange();
  if (!currentRange.start || !currentRange.end) return null;
  const comparisonState = getComparisonWindowState();
  const comparisonDescriptor = comparisonState.descriptor || {};

  return {
    primary: {
      instrument: getPrimaryInstrument(),
      timeframe: store.getCurrentTimeframe(),
      start: currentRange.start,
      end: currentRange.end,
      outerRange: store.getRequestedOuterRange(),
    },
    replay: {
      enabled: true,
      cursorTimestamp: Number(replayState.cursorTimestamp),
      cursorIndex: Number.isFinite(Number(replayState.cursorIndex)) ? Number(replayState.cursorIndex) : -1,
      speedIndex: Number.isFinite(Number(replayState.speedIndex)) ? Number(replayState.speedIndex) : 2,
    },
    comparison: {
      enabled: comparisonState.enabled,
      viewId: comparisonDescriptor.viewId,
      instrument: comparisonDescriptor.instrument,
      timeframe: comparisonDescriptor.timeframe,
      syncMode: comparisonDescriptor.syncMode,
      layoutMode: comparisonDescriptor.layoutMode,
    },
  };
}

export function flushReplayHistoryCheckpoint() {
  clearSaveTimer();
  const checkpoint = createReplayHistoryCheckpoint();
  return checkpoint ? saveReplayHistoryItem(checkpoint) : null;
}

function scheduleReplayHistorySave() {
  if (!isValidReplayState(lastReplayState)) return;
  clearSaveTimer();
  const win = getWindowObject();
  if (!win) {
    flushReplayHistoryCheckpoint();
    return;
  }
  saveTimer = win.setTimeout(() => {
    saveTimer = null;
    flushReplayHistoryCheckpoint();
  }, SAVE_DEBOUNCE_MS);
}

function handleReplayChanged(state = {}) {
  lastReplayState = {
    enabled: Boolean(state.enabled),
    cursorIndex: Number.isFinite(Number(state.cursorIndex)) ? Number(state.cursorIndex) : -1,
    cursorTimestamp: Number.isFinite(Number(state.cursorTimestamp)) ? Number(state.cursorTimestamp) : null,
    speedIndex: Number.isFinite(Number(state.speedIndex)) ? Number(state.speedIndex) : 2,
  };
  scheduleReplayHistorySave();
}

export function initReplayHistoryPersistence() {
  bus.on('replay:changed', handleReplayChanged);
  bus.on('bars:loaded', scheduleReplayHistorySave);
  bus.on('comparison-window:changed', scheduleReplayHistorySave);
  getWindowObject()?.addEventListener('beforeunload', flushReplayHistoryCheckpoint);
}
