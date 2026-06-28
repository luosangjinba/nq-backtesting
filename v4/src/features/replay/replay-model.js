import { normalizeTimestamp } from './replay-time-utils.js';

export const REPLAY_CONTROL_MODES = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PICKING: 'picking',
});

export function createLegacyReplayState({ timeframe = 1, speedIndex = 2 } = {}) {
  return {
    displayBars: [],
    chartData: [],
    mode: REPLAY_CONTROL_MODES.IDLE,
    enabled: false,
    cursorIndex: -1,
    lastCursorIndex: -1,
    cursorTimestampAnchor: null,
    lastCursorTimestampAnchor: null,
    activeTimeframe: timeframe,
    lastReplayPickHandledAt: 0,
    speedIndex,
    historyOpen: false,
  };
}

export function getCursorTimestamp(state) {
  return normalizeTimestamp(state.cursorTimestampAnchor ?? state.displayBars[state.cursorIndex]?.timestamp);
}

export function getLastCursorTimestamp(state) {
  return normalizeTimestamp(state.lastCursorTimestampAnchor ?? state.displayBars[state.lastCursorIndex]?.timestamp);
}

export function rememberCursor(state) {
  if (state.cursorIndex < 0) return;
  state.lastCursorIndex = state.cursorIndex;
  state.lastCursorTimestampAnchor = getCursorTimestamp(state);
}

export function resetReplayStateFields(state) {
  state.enabled = false;
  state.mode = REPLAY_CONTROL_MODES.IDLE;
  state.cursorIndex = -1;
  state.lastCursorIndex = -1;
  state.cursorTimestampAnchor = null;
  state.lastCursorTimestampAnchor = null;
}

export function restoreFullChartState(state, { savePosition = true } = {}) {
  if (savePosition) {
    rememberCursor(state);
  }
  state.enabled = false;
  state.mode = REPLAY_CONTROL_MODES.IDLE;
  state.cursorIndex = -1;
  state.cursorTimestampAnchor = null;
}

export function applyReplaySliceState(state, index, { rememberPrevious = false, viewportSnapshot = null } = {}) {
  if (rememberPrevious) {
    rememberCursor(state);
  }
  state.enabled = true;
  state.mode = state.mode === REPLAY_CONTROL_MODES.PLAYING
    ? REPLAY_CONTROL_MODES.PLAYING
    : REPLAY_CONTROL_MODES.IDLE;
  state.cursorIndex = Math.max(0, Math.min(index, state.chartData.length - 1));
  state.cursorTimestampAnchor =
    normalizeTimestamp(viewportSnapshot?.cursorTimestamp) ??
    normalizeTimestamp(state.displayBars[state.cursorIndex]?.timestamp);
}

export function applyBeforeFirstPickState(state) {
  rememberCursor(state);
  state.enabled = true;
  state.cursorIndex = -1;
  state.cursorTimestampAnchor = null;
}

export function clearReplayAfterSyncState(state) {
  state.enabled = false;
  state.mode = REPLAY_CONTROL_MODES.IDLE;
  state.cursorIndex = -1;
  state.lastCursorIndex = -1;
  state.cursorTimestampAnchor = null;
  state.lastCursorTimestampAnchor = null;
}

export function getReplayChangedPayload(state) {
  return {
    enabled: state.enabled,
    cursorIndex: state.cursorIndex,
    cursorTimestamp: state.enabled && state.cursorIndex >= 0 ? getCursorTimestamp(state) : null,
    speedIndex: state.speedIndex,
  };
}

export function getReplayRestoreSnapshotState(state, visibleRange) {
  if (!state.enabled || state.cursorIndex < 0) return null;

  return {
    enabled: true,
    cursorTimestamp: getCursorTimestamp(state),
    lastTimestamp: state.lastCursorIndex >= 0 ? getLastCursorTimestamp(state) : null,
    sourceTimeframe: state.activeTimeframe,
    sourceBars: state.displayBars,
    visibleRange,
    dataCount: state.cursorIndex + 1,
  };
}
