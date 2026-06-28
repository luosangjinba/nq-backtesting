import * as bus from '../event-bus.js';

export const CHART_MODES = Object.freeze({
  HISTORY: 'history',
  LEGACY_REPLAY: 'legacy-replay',
  FX_REPLAY: 'fx-replay',
});

export const CHART_MODE_SOURCES = Object.freeze({
  LEGACY_REPLAY_RESET: 'legacy-replay-reset',
  LEGACY_REPLAY_EXIT: 'legacy-replay-exit',
  LEGACY_REPLAY_SLICE: 'legacy-replay-slice',
  LEGACY_REPLAY_PICK_BEFORE_FIRST: 'legacy-replay-pick-before-first',
  LEGACY_REPLAY_SYNC: 'legacy-replay-sync',
});

const VALID_MODES = new Set(Object.values(CHART_MODES));

let currentMode = CHART_MODES.HISTORY;

export function normalizeChartMode(mode) {
  return VALID_MODES.has(mode) ? mode : CHART_MODES.HISTORY;
}

export function getChartMode() {
  return currentMode;
}

export function isChartMode(mode) {
  return currentMode === normalizeChartMode(mode);
}

export function setChartMode(mode, metadata = {}) {
  const nextMode = normalizeChartMode(mode);
  if (nextMode === currentMode) {
    return currentMode;
  }

  const previousMode = currentMode;
  currentMode = nextMode;
  bus.emit('chart-mode:changed', {
    mode: currentMode,
    previousMode,
    metadata,
  });
  return currentMode;
}

export function enterHistoryMode(metadata = {}) {
  return setChartMode(CHART_MODES.HISTORY, metadata);
}

export function enterLegacyReplayMode(metadata = {}) {
  return setChartMode(CHART_MODES.LEGACY_REPLAY, metadata);
}
