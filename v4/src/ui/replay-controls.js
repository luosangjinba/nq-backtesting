// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument, setPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  setComparisonWindowEnabled,
  updateComparisonViewDescriptor,
} from '../comparison/comparison-window-store.js';
import { timeframeToString } from '../config.js';
import {
  clearReplayHistory,
  deleteReplayHistoryItem,
  getReplayHistory,
} from './replay-history-store.js';
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
import { loadReplayHistoryItem as restoreReplayHistoryItem } from './replay/replay-history-actions.js';
import {
  REPLAY_SPEEDS,
  getReplayActionFromEvent,
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
import { renderReplayControlsView } from '../features/replay/replay-view.js';
import {
  appendPrimaryChartBar,
  clearPrimaryChartData,
  projectPrimaryChartBars,
  replacePrimaryChartData,
  replacePrimaryChartSlice,
} from '../runtime/primary-chart-runtime.js';
import { enterHistoryMode, enterLegacyReplayMode } from '../runtime/chart-mode-store.js';

let controlsEl = null;
const replayState = createLegacyReplayState({
  timeframe: store.getCurrentTimeframe(),
  speedIndex: 2,
});
let timer = null;

function setToolbarRange(start, end, timeframe) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
  if (tfSelect && timeframe) tfSelect.value = String(timeframe);
}

function setToolbarPrimaryInstrument(instrument) {
  const normalizedInstrument = setPrimaryInstrument(instrument);
  const primaryInstrumentSelect = document.getElementById('primaryInstrumentSelect');
  if (primaryInstrumentSelect) primaryInstrumentSelect.value = normalizedInstrument;
  return normalizedInstrument;
}

function applyComparisonState(comparison) {
  if (!comparison) {
    setComparisonWindowEnabled(false);
    return;
  }
  const descriptorPatch = Object.fromEntries(
    Object.entries({
      viewId: comparison.viewId,
      instrument: comparison.instrument,
      timeframe: comparison.timeframe,
      syncMode: comparison.syncMode,
      layoutMode: comparison.layoutMode,
    }).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  if (!comparison?.enabled) {
    if (Object.keys(descriptorPatch).length) updateComparisonViewDescriptor(descriptorPatch);
    setComparisonWindowEnabled(false);
    return;
  }

  updateComparisonViewDescriptor(descriptorPatch);
  setComparisonWindowEnabled(true);
}

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
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  resetReplayStateFields(replayState);
  enterHistoryMode({ source: 'legacy-replay-reset' });
  emitReplayChanged();
  render();
}

function restoreFullChart(savePosition = true) {
  stopTimer();
  restoreFullChartState(replayState, { savePosition });
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  if (replayState.chartData.length > 0) {
    replacePrimaryChartData(replayState.chartData, { showStart: true });
  }
  enterHistoryMode({ source: 'legacy-replay-exit' });
  emitReplayChanged();
  render();
}

function renderSlice(index, followEnd = true, rememberPrevious = false, viewportSnapshot = null) {
  if (replayState.chartData.length === 0) return;
  const previousRange = viewportSnapshot?.visibleRange || chart.getVisibleLogicalRange();
  const previousDataCount =
    viewportSnapshot?.dataCount ?? (replayState.cursorIndex >= 0 ? replayState.cursorIndex + 1 : null);
  if (rememberPrevious && replayState.cursorIndex >= 0) {
    rememberCursor(replayState);
  }
  enterLegacyReplayMode({ source: 'legacy-replay-slice' });
  applyReplaySliceState(replayState, index, { viewportSnapshot });
  replacePrimaryChartSlice(replayState.chartData, replayState.cursorIndex, { followEnd, previousRange, previousDataCount });
  chart.showReplayCursor(replayState.chartData[replayState.cursorIndex].time);
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

  const previousRange = chart.getVisibleLogicalRange();
  const previousDataCount = replayState.cursorIndex + 1;
  replayState.cursorIndex += 1;
  replayState.cursorTimestampAnchor = normalizeTimestamp(replayState.displayBars[replayState.cursorIndex]?.timestamp);
  appendPrimaryChartBar(replayState.chartData[replayState.cursorIndex], replayState.cursorIndex + 1, {
    previousRange,
    previousDataCount,
  });
  chart.showReplayCursor(replayState.chartData[replayState.cursorIndex].time);
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

  chart.hidePickPreviewCursor();
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

  const currentRange = chart.getVisibleLogicalRange();
  const keepIndex = index - 1;
  chart.hidePickPreviewCursor();
  replayState.lastReplayPickHandledAt = Date.now();
  replayState.mode = REPLAY_CONTROL_MODES.IDLE;
  if (keepIndex < 0) {
    applyBeforeFirstPickState(replayState);
    enterLegacyReplayMode({ source: 'legacy-replay-pick-before-first' });
    clearPrimaryChartData();
    chart.hideReplayCursor();
    emitReplayChanged();
    render();
  } else {
    renderSlice(keepIndex, false, true);
  }
  if (currentRange) {
    chart.setVisibleLogicalRange(currentRange.from, currentRange.to);
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
    if (chart.hasPickPreviewCursor()) chart.hidePickPreviewCursor();
    return;
  }

  const index = findBarIndex(param?.time);
  if (index < 0) {
    if (chart.hasPickPreviewCursor()) chart.hidePickPreviewCursor();
    return;
  }

  chart.showPickPreviewCursor(replayState.chartData[index].time);
}

function handleControlClick(e) {
  const action = getReplayActionFromEvent(e);
  if (!action) return;

  if (action === 'history-toggle') {
    replayState.historyOpen = !replayState.historyOpen;
    render();
    return;
  }
  if (action === 'history-delete') {
    const id = e.target.closest('[data-history-id]')?.dataset.historyId;
    if (deleteReplayHistoryItem(id)) render();
    return;
  }
  if (action === 'history-clear') {
    clearReplayHistory(getPrimaryInstrument());
    render();
    return;
  }
  if (action === 'history-load') {
    const id = e.target.closest('[data-history-id]')?.dataset.historyId;
    restoreReplayHistoryItem(id, {
      primaryInstrument: getPrimaryInstrument(),
      setToolbarPrimaryInstrument,
      setToolbarRange,
      applyComparisonState,
      restoreReplayToTimestamp,
      closeHistoryPanel: () => {
        replayState.historyOpen = false;
      },
      render,
    });
    return;
  }

  if (action === 'toggle') toggleReplayEnabled();
  if (action === 'pick') selectBar();
  if (action === 'first') jumpStart();
  if (action === 'last') jumpLastPosition();
  if (action === 'next-0929') jumpNext0929();
  if (action === 'back') stepBack();
  if (action === 'play') togglePlay();
  if (action === 'forward') stepForward();
  if (action === 'jump') jumpToTime();
  if (action === 'close') restoreFullChart();
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
  if (!controlsEl) return;

  const hasData = replayState.chartData.length > 0;
  const currentBar = replayState.cursorIndex >= 0 ? replayState.displayBars[replayState.cursorIndex] : null;
  const isPlaying = Boolean(timer);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const lastDisabled = !hasData || replayState.lastCursorIndex < 0;
  const history = getReplayHistory(getPrimaryInstrument());
  controlsEl.innerHTML = renderReplayControlsView({
    hasData,
    enabled: replayState.enabled,
    currentBar,
    cursorIndex: replayState.cursorIndex,
    dataCount: replayState.chartData.length,
    isPlaying,
    tfLabel,
    mode: replayState.mode,
    speedIndex: replayState.speedIndex,
    lastDisabled,
    historyOpen: replayState.historyOpen,
    history,
    speeds: REPLAY_SPEEDS,
  });

  controlsEl.querySelector('.replay-speed')?.addEventListener('change', handleSpeedChange);
  controlsEl.querySelector('[data-replay-jump-input]')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      jumpToTime();
    }
  });
}

export function getReplayRestoreSnapshot() {
  return getReplayRestoreSnapshotState(replayState, chart.getVisibleLogicalRange());
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
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  const nextTimeframe = store.getCurrentTimeframe();
  replayState.displayBars = getReplayRestoreDisplayBars(
    store.getDisplayBars(),
    nextTimeframe,
    cursorTimestamp,
    restoreSnapshot
  );
  replayState.chartData = projectPrimaryChartBars(replayState.displayBars, nextTimeframe);
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
    replacePrimaryChartData(replayState.chartData, { showStart: true });
  }
  enterHistoryMode({ source: 'legacy-replay-sync' });
  emitReplayChanged();
  render();
}

export function initReplayControls() {
  controlsEl = document.getElementById('replay-controls');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  window.addEventListener('keydown', handleKeydown);
  chart.onClick(handleChartClick);
  chart.onCrosshairMove(handleCrosshairMove);
  bus.on('bars:cleared', resetReplayState);
  render();
}
