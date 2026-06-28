import * as bus from '../event-bus.js';

export const CHART_MODES = Object.freeze({
  HISTORY: 'history',
  LEGACY_REPLAY: 'legacy-replay',
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
