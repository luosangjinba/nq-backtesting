// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  findBarIndexAtOrBeforeTimestamp,
  formatReplayTime,
  getReplayRestoreDisplayBars,
  getUtcDateKey,
  getUtcDateTimeTimestamp,
  normalizeTimeKey,
  normalizeTimestamp,
  parseReplayJumpTimestamp,
} from '../features/replay/replay-time-utils.js';
import {
  getReplaySpeed,
  isTextEditingTarget,
} from '../features/replay/replay-controller.js';
import {
  REPLAY_CONTROL_MODES,
  applyBeforeFirstPickState,
  applyReplaySliceState,
  clearReplayAfterSyncState,
  createLegacyReplayState,
  getCursorTimestamp as getReplayModelCursorTimestamp,
  getLastCursorTimestamp as getReplayModelLastCursorTimestamp,
  getReplayChangedPayload,
  getReplayRestoreSnapshotState,
  rememberCursor,
  resetReplayStateFields,
  restoreFullChartState,
} from '../features/replay/replay-model.js';
import { handleReplayControlClick } from '../features/replay/replay-control-dispatcher.js';
import { renderReplayToolbarControls } from '../features/replay/replay-toolbar-renderer.js';
import * as replayChart from '../features/replay/replay-chart-adapter.js';
import {
  CHART_MODE_SOURCES,
  enterHistoryMode,
  enterLegacyReplayMode,
} from '../runtime/chart-mode-store.js';

let controlsEl = null;
const replayState = createLegacyReplayState({
  timeframe: store.getCurrentTimeframe(),
  speedIndex: 2,
});
let timer = null;

function findNextDailyTimeIndex(hour, minute) {
  if (!replayState.enabled || replayState.cursorIndex < 0 || !replayState.displayBars.length) return -1;

  const currentDate = getUtcDateKey(replayState.displayBars[replayState.cursorIndex]?.timestamp);
  const tfSeconds = Number(store.getCurrentTimeframe()) * 60;
  const visitedDates = new Set();

  for (let index = replayState.cursorIndex + 1; index < replayState.displayBars.length; index += 1) {
    const bar = replayState.displayBars[index];
    const dateKey = getUtcDateKey(bar?.timestamp);
    if (!dateKey || dateKey <= currentDate || visitedDates.has(dateKey)) continue;
    visitedDates.add(dateKey);

    const targetTimestamp = getUtcDateTimeTimestamp(dateKey, hour, minute);
    if (targetTimestamp === null) continue;
    const targetIndex = findBarIndexAtOrBeforeTimestamp(replayState.displayBars, targetTimestamp, store.getCurrentTimeframe());
    if (targetIndex >= index || getUtcDateKey(replayState.displayBars[targetIndex]?.timestamp) === dateKey) {
      return targetIndex;
    }

    const barTimestamp = Number(bar?.timestamp);
    if (
      Number.isFinite(barTimestamp) &&
      targetTimestamp >= barTimestamp &&
      targetTimestamp < barTimestamp + tfSeconds
    ) {
      return index;
    }
  }

  return -1;
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function getCursorTimestamp() {
  return getReplayModelCursorTimestamp(replayState);
}

function getLastCursorTimestamp() {
  return getReplayModelLastCursorTimestamp(replayState);
}

function emitReplayChanged() {
  bus.emit('replay:changed', getReplayChangedPayload(replayState));
}

function setMode(nextMode) {
  replayState.mode = nextMode;
  render();
}

function resetReplayState() {
  stopTimer();
  replayChart.clearReplayChartCursors();
  resetReplayStateFields(replayState);
  enterHistoryMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_RESET });
  emitReplayChanged();
  render();
}

function restoreFullChart(savePosition = true) {
  stopTimer();
  restoreFullChartState(replayState, { savePosition });
  replayChart.clearReplayChartCursors();
  if (replayState.chartData.length > 0) {
    replayChart.replacePrimaryChartData(replayState.chartData, { showStart: true });
  }
  enterHistoryMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_EXIT });
  emitReplayChanged();
  render();
}

function renderSlice(index, followEnd = true, rememberPrevious = false, viewportSnapshot = null) {
  if (replayState.chartData.length === 0) return;
  const previousRange = viewportSnapshot?.visibleRange || replayChart.getVisibleLogicalRange();
  const previousDataCount =
    viewportSnapshot?.dataCount ?? (replayState.cursorIndex >= 0 ? replayState.cursorIndex + 1 : null);
  if (rememberPrevious && replayState.cursorIndex >= 0) {
    rememberCursor(replayState);
  }
  enterLegacyReplayMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_SLICE });
  applyReplaySliceState(replayState, index, { viewportSnapshot });
  replayChart.replacePrimaryChartSlice(replayState.chartData, replayState.cursorIndex, { followEnd, previousRange, previousDataCount });
  replayChart.showReplayCursor(replayState.chartData[replayState.cursorIndex].time);
  emitReplayChanged();
  render();
}

function stepForward() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;

  if (replayState.cursorIndex < 0) {
    renderSlice(0);
    return;
  }

  if (replayState.cursorIndex >= replayState.chartData.length - 1) {
    stopTimer();
    setMode(REPLAY_CONTROL_MODES.IDLE);
    return;
  }

  const previousRange = replayChart.getVisibleLogicalRange();
  const previousDataCount = replayState.cursorIndex + 1;
  replayState.cursorIndex += 1;
  replayState.cursorTimestampAnchor = normalizeTimestamp(replayState.displayBars[replayState.cursorIndex]?.timestamp);
  replayChart.appendPrimaryChartBar(replayState.chartData[replayState.cursorIndex], replayState.cursorIndex + 1, {
    previousRange,
    previousDataCount,
  });
  replayChart.showReplayCursor(replayState.chartData[replayState.cursorIndex].time);
  emitReplayChanged();
  render();
}

function stepBack() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;

  renderSlice(Math.max(0, replayState.cursorIndex - 1));
}

function jumpStart() {
  if (replayState.chartData.length === 0) return;
  stopTimer();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(0, true, true);
}

function jumpLastPosition() {
  if (replayState.chartData.length === 0 || replayState.lastCursorIndex < 0) return;
  stopTimer();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(replayState.lastCursorIndex, true, true);
}

function jumpNext0929() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;

  const index = findNextDailyTimeIndex(9, 29);
  if (index < 0) {
    bus.emit('status:update', {
      text: 'Replay 跳转失败: 当前加载区间内没有下一日 09:29',
      isError: true,
    });
    return;
  }

  stopTimer();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(index, true, true);
  bus.emit('status:update', {
    text: `Replay 跳转到下一日 09:29: ${formatReplayTime(replayState.displayBars[index])}`,
    isError: false,
  });
}

function jumpToTime() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;

  const input = controlsEl?.querySelector('[data-replay-jump-input]');
  if (!input) return;

  const { timestamp, formatted } = parseReplayJumpTimestamp(input.value);
  input.value = formatted;

  if (timestamp === null || Number.isNaN(timestamp)) {
    bus.emit('status:update', { text: 'Replay 跳转失败: 时间格式无效', isError: true });
    return;
  }

  const index = findBarIndexAtOrBeforeTimestamp(replayState.displayBars, timestamp, store.getCurrentTimeframe());
  if (index < 0) {
    bus.emit('status:update', {
      text: 'Replay 跳转失败: 时间不在当前加载区间',
      isError: true,
    });
    return;
  }

  stopTimer();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(index, true, true);
  bus.emit('status:update', {
    text: `Replay 跳转: ${formatReplayTime(replayState.displayBars[index])}`,
    isError: false,
  });
}

export function restoreReplayToTimestamp(timestamp, nextSpeedIndex = replayState.speedIndex) {
  const index = findBarIndexAtOrBeforeTimestamp(replayState.displayBars, timestamp, store.getCurrentTimeframe());
  if (index < 0) return false;
  stopTimer();
  replayState.speedIndex = Number.isFinite(Number(nextSpeedIndex)) ? Number(nextSpeedIndex) : replayState.speedIndex;
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(index, true, true);
  return true;
}

function enableReplay() {
  if (replayState.chartData.length === 0) return;
  const startIndex = replayState.lastCursorIndex >= 0 ? replayState.lastCursorIndex : 0;
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  renderSlice(startIndex);
}

function toggleReplayEnabled() {
  if (replayState.enabled) {
    restoreFullChart(true);
  } else {
    enableReplay();
  }
}

function togglePlay() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;

  if (timer) {
    stopTimer();
    setMode(REPLAY_CONTROL_MODES.IDLE);
    return;
  }

  if (replayState.cursorIndex < 0) {
    renderSlice(0);
  }

  replayState.mode = REPLAY_CONTROL_MODES.PLAYING;
  timer = window.setInterval(stepForward, getReplaySpeed(replayState.speedIndex).ms);
  render();
}

function selectBar() {
  if (!replayState.enabled || replayState.chartData.length === 0) return;
  stopTimer();
  setMode(REPLAY_CONTROL_MODES.PICKING);
  bus.emit('status:update', { text: '点击图表选择 Replay 回退位置', isError: false });
}

function cancelPick() {
  if (replayState.mode !== REPLAY_CONTROL_MODES.PICKING) return false;

  replayChart.hidePickPreviewCursor();
  setMode(REPLAY_CONTROL_MODES.IDLE);
  bus.emit('status:update', { text: 'Replay Pick 已取消', isError: false });
  return true;
}

function findBarIndex(time) {
  if (time === undefined || time === null) return -1;
  const target = normalizeTimeKey(time);
  return replayState.chartData.findIndex((bar) => normalizeTimeKey(bar.time) === target);
}

function handleChartClick(param) {
  if (!replayState.enabled || replayState.mode !== REPLAY_CONTROL_MODES.PICKING) return;
  const index = findBarIndex(param?.time);
  if (index < 0) return;

  const currentRange = replayChart.getVisibleLogicalRange();
  const keepIndex = index - 1;
  replayChart.hidePickPreviewCursor();
  replayState.lastReplayPickHandledAt = Date.now();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  if (keepIndex < 0) {
    applyBeforeFirstPickState(replayState);
    enterLegacyReplayMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_PICK_BEFORE_FIRST });
    replayChart.clearPrimaryChartData();
    replayChart.hideReplayCursor();
    emitReplayChanged();
    render();
  } else {
    renderSlice(keepIndex, false, true);
  }
  if (currentRange) {
    replayChart.setVisibleLogicalRange(currentRange.from, currentRange.to);
  }
  bus.emit('status:update', {
    text: keepIndex < 0
      ? `Replay 位置: 0/${replayState.chartData.length} before ${formatReplayTime(replayState.displayBars[index])}`
      : `Replay 位置: ${keepIndex + 1}/${replayState.chartData.length} before ${formatReplayTime(replayState.displayBars[index])}`,
    isError: false,
  });
}

function handleCrosshairMove(param) {
  if (!replayState.enabled || replayState.mode !== REPLAY_CONTROL_MODES.PICKING) {
    if (replayChart.hasPickPreviewCursor()) replayChart.hidePickPreviewCursor();
    return;
  }

  const index = findBarIndex(param?.time);
  if (index < 0) {
    if (replayChart.hasPickPreviewCursor()) replayChart.hidePickPreviewCursor();
    return;
  }

  replayChart.showPickPreviewCursor(replayState.chartData[index].time);
}

function handleControlClick(e) {
  handleReplayControlClick({
    event: e,
    replayState,
    restoreReplayToTimestamp,
    render,
    actions: {
      toggle: toggleReplayEnabled,
      pick: selectBar,
      first: jumpStart,
      last: jumpLastPosition,
      'next-0929': jumpNext0929,
      back: stepBack,
      play: togglePlay,
      forward: stepForward,
      jump: jumpToTime,
      close: restoreFullChart,
    },
  });
}

function handleSpeedChange(e) {
  replayState.speedIndex = Number(e.target.value);
  if (timer) {
    stopTimer();
    togglePlay();
  }
  emitReplayChanged();
  render();
}

function handleKeydown(e) {
  if (isTextEditingTarget(e.target) || !replayState.enabled || replayState.chartData.length === 0) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    stepForward();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    stepBack();
  } else if (e.key === 'Home') {
    e.preventDefault();
    jumpStart();
  }
}

function render() {
  renderReplayToolbarControls({
    controlsEl,
    replayState,
    currentTimeframe: store.getCurrentTimeframe(),
    primaryInstrument: getPrimaryInstrument(),
    isPlaying: Boolean(timer),
    onSpeedChange: handleSpeedChange,
    onJumpEnter: jumpToTime,
  });
}

export function getReplayRestoreSnapshot() {
  return getReplayRestoreSnapshotState(replayState, replayChart.getVisibleLogicalRange());
}

export function getReplayVisibleBars() {
  if (!replayState.enabled || replayState.cursorIndex < 0) return null;
  return replayState.displayBars.slice(0, replayState.cursorIndex + 1);
}

export function getReplayCursorTimestamp() {
  return replayState.enabled && replayState.cursorIndex >= 0 ? getCursorTimestamp() : null;
}

export function isReplayPicking() {
  return replayState.enabled && replayState.mode === REPLAY_CONTROL_MODES.PICKING;
}

export function didReplayPickJustHandleClick() {
  return Date.now() - replayState.lastReplayPickHandledAt < 250;
}

export function syncReplayData(restoreSnapshot = null) {
  const shouldRestoreReplay =
    (restoreSnapshot?.enabled && restoreSnapshot.cursorTimestamp !== undefined) ||
    (replayState.enabled && replayState.cursorIndex >= 0);
  const cursorTimestamp = normalizeTimestamp(restoreSnapshot?.cursorTimestamp ?? getCursorTimestamp());
  const lastTimestamp =
    normalizeTimestamp(restoreSnapshot?.lastTimestamp ?? (replayState.lastCursorIndex >= 0 ? getLastCursorTimestamp() : null));

  stopTimer();
  replayChart.clearReplayChartCursors();
  const nextTimeframe = store.getCurrentTimeframe();
  replayState.displayBars = getReplayRestoreDisplayBars(
    store.getDisplayBars(),
    nextTimeframe,
    cursorTimestamp,
    restoreSnapshot
  );
  replayState.chartData = replayChart.projectPrimaryChartBars(replayState.displayBars, nextTimeframe);
  replayState.activeTimeframe = nextTimeframe;

  if (shouldRestoreReplay && replayState.chartData.length > 0) {
    const restoredIndex = findBarIndexAtOrBeforeTimestamp(replayState.displayBars, cursorTimestamp, store.getCurrentTimeframe());
    if (restoredIndex >= 0) {
      replayState.lastCursorIndex = findBarIndexAtOrBeforeTimestamp(replayState.displayBars, lastTimestamp, store.getCurrentTimeframe());
      replayState.lastCursorTimestampAnchor = lastTimestamp;
      replayState.mode = REPLAY_CONTROL_MODES.IDLE;
      replayState.cursorIndex = -1;
      renderSlice(restoredIndex, true, false, {
        ...restoreSnapshot,
        cursorTimestamp,
        lastTimestamp,
      });
      bus.emit('status:update', {
        text: `Replay 对齐: ${formatReplayTime(replayState.displayBars[restoredIndex])}`,
        isError: false,
      });
      return;
    }
  }

  clearReplayAfterSyncState(replayState);
  if (restoreSnapshot?.enabled && replayState.chartData.length > 0) {
    replayChart.replacePrimaryChartData(replayState.chartData, { showStart: true });
  }
  enterHistoryMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_SYNC });
  emitReplayChanged();
  render();
}

export function initReplayControls() {
  controlsEl = document.getElementById('replay-controls');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  window.addEventListener('keydown', handleKeydown);
  replayChart.onReplayChartClick(handleChartClick);
  replayChart.onReplayCrosshairMove(handleCrosshairMove);
  bus.on('bars:cleared', resetReplayState);
  render();
}
