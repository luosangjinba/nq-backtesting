import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { saveReplayHistoryItem } from './replay-history-store.js';

const SAVE_DEBOUNCE_MS = 800;
const PRIMARY_INSTRUMENT = 'NQ';

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

  return {
    primary: {
      instrument: PRIMARY_INSTRUMENT,
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
    split: {
      enabled: secondaryStore.isSecondaryEnabled(),
      instrument: secondaryStore.getSecondaryInstrument(),
      timeframe: secondaryStore.getSecondaryTimeframe(),
      layout: secondaryStore.getSplitLayout(),
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
  bus.on('secondary-chart:settings-changed', scheduleReplayHistorySave);
  getWindowObject()?.addEventListener('beforeunload', flushReplayHistoryCheckpoint);
}
