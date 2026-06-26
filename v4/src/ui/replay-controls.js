// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { getBarChartTime } from '../chart/time-projection.js';
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
} from './replay/replay-time-utils.js';
import { renderReplayControlsView } from './replay/replay-controls-view.js';
import { loadReplayHistoryItem as restoreReplayHistoryItem } from './replay/replay-history-actions.js';

const SPEEDS = [
  { label: '1x', ms: 900 },
  { label: '3x', ms: 500 },
  { label: '5x', ms: 300 },
  { label: '7x', ms: 180 },
  { label: '10x', ms: 100 },
];

let controlsEl = null;
let displayBars = [];
let chartData = [];
let mode = 'idle';
let enabled = false;
let cursorIndex = -1;
let lastCursorIndex = -1;
let cursorTimestampAnchor = null;
let lastCursorTimestampAnchor = null;
let replayStartTimestampAnchor = null;
let replayStartIndex = 0;
let activeTimeframe = store.getCurrentTimeframe();
let lastReplayPickHandledAt = 0;
let speedIndex = 2;
let timer = null;
let historyOpen = false;

function toChartBar(bar) {
  const tf = store.getCurrentTimeframe();
  return {
    time: getBarChartTime(bar, tf),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

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
  if (!enabled || cursorIndex < 0 || !displayBars.length) return -1;

  const currentDate = getUtcDateKey(displayBars[cursorIndex]?.timestamp);
  const tfSeconds = Number(store.getCurrentTimeframe()) * 60;
  const visitedDates = new Set();

  for (let index = cursorIndex + 1; index < displayBars.length; index += 1) {
    const bar = displayBars[index];
    const dateKey = getUtcDateKey(bar?.timestamp);
    if (!dateKey || dateKey <= currentDate || visitedDates.has(dateKey)) continue;
    visitedDates.add(dateKey);

    const targetTimestamp = getUtcDateTimeTimestamp(dateKey, hour, minute);
    if (targetTimestamp === null) continue;
    const targetIndex = findBarIndexAtOrBeforeTimestamp(displayBars, targetTimestamp, store.getCurrentTimeframe());
    if (targetIndex >= index || getUtcDateKey(displayBars[targetIndex]?.timestamp) === dateKey) {
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
  return normalizeTimestamp(cursorTimestampAnchor ?? displayBars[cursorIndex]?.timestamp);
}

function getLastCursorTimestamp() {
  return normalizeTimestamp(lastCursorTimestampAnchor ?? displayBars[lastCursorIndex]?.timestamp);
}

function emitReplayChanged() {
  bus.emit('replay:changed', {
    enabled,
    cursorIndex,
    cursorTimestamp: enabled && cursorIndex >= 0 ? getCursorTimestamp() : null,
    dataCount: chartData.length,
    replayStartIndex,
    replayStartTimestamp: replayStartTimestampAnchor,
    isPlaying: Boolean(timer),
    speedIndex,
  });
}

function findBarIndexAtOrAfterTimestamp(bars, targetTimestamp) {
  if (!bars.length || targetTimestamp === null || targetTimestamp === undefined) return -1;
  const target = Number(targetTimestamp);
  if (!Number.isFinite(target)) return -1;
  for (let index = 0; index < bars.length; index += 1) {
    if (Number(bars[index]?.timestamp) >= target) return index;
  }
  return -1;
}

function resolveReplayStartIndex(timestamp = replayStartTimestampAnchor) {
  const target = normalizeTimestamp(timestamp);
  const index = findBarIndexAtOrAfterTimestamp(displayBars, target);
  if (index >= 0) return index;
  return 0;
}

function getReplayProgressIndex() {
  if (!enabled || cursorIndex < replayStartIndex) return 0;
  return cursorIndex - replayStartIndex + 1;
}

function getReplayProgressCount() {
  return Math.max(0, chartData.length - replayStartIndex);
}

function setMode(nextMode) {
  mode = nextMode;
  render();
}

function isTextEditingTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}

function resetReplayState() {
  stopTimer();
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  enabled = false;
  mode = 'idle';
  cursorIndex = -1;
  lastCursorIndex = -1;
  cursorTimestampAnchor = null;
  lastCursorTimestampAnchor = null;
  replayStartTimestampAnchor = null;
  replayStartIndex = 0;
  emitReplayChanged();
  render();
}

function restoreFullChart(savePosition = true) {
  stopTimer();
  if (savePosition && cursorIndex >= 0) {
    lastCursorIndex = cursorIndex;
    lastCursorTimestampAnchor = getCursorTimestamp();
  }
  enabled = false;
  mode = 'idle';
  cursorIndex = -1;
  cursorTimestampAnchor = null;
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  if (chartData.length > 0) {
    chart.setData(chartData);
    chart.showStartOfData(chartData.length);
  }
  emitReplayChanged();
  render();
}

function renderSlice(index, followEnd = true, rememberPrevious = false, viewportSnapshot = null) {
  if (chartData.length === 0) return;
  const previousRange = viewportSnapshot?.visibleRange || chart.getVisibleLogicalRange();
  const previousDataCount =
    viewportSnapshot?.dataCount ?? (cursorIndex >= 0 ? cursorIndex + 1 : null);
  if (rememberPrevious && cursorIndex >= 0) {
    lastCursorIndex = cursorIndex;
    lastCursorTimestampAnchor = getCursorTimestamp();
  }
  enabled = true;
  mode = mode === 'playing' ? 'playing' : 'idle';
  cursorIndex = Math.max(0, Math.min(index, chartData.length - 1));
  cursorTimestampAnchor =
    normalizeTimestamp(viewportSnapshot?.cursorTimestamp) ?? normalizeTimestamp(displayBars[cursorIndex]?.timestamp);
  chart.setData(chartData.slice(0, cursorIndex + 1));
  if (followEnd) {
    chart.showEndOfData(cursorIndex + 1, previousRange, previousDataCount);
  }
  chart.showReplayCursor(chartData[cursorIndex].time);
  emitReplayChanged();
  render();
}

function stepForward() {
  if (!enabled || chartData.length === 0) return;

  if (cursorIndex < 0) {
    renderSlice(replayStartIndex);
    return;
  }

  if (cursorIndex >= chartData.length - 1) {
    stopTimer();
    setMode('idle');
    return;
  }

  const previousRange = chart.getVisibleLogicalRange();
  const previousDataCount = cursorIndex + 1;
  cursorIndex += 1;
  cursorTimestampAnchor = normalizeTimestamp(displayBars[cursorIndex]?.timestamp);
  chart.updateBar(chartData[cursorIndex]);
  chart.showEndOfData(cursorIndex + 1, previousRange, previousDataCount);
  chart.showReplayCursor(chartData[cursorIndex].time);
  emitReplayChanged();
  render();
}

function stepBack() {
  if (!enabled || chartData.length === 0) return;

  renderSlice(Math.max(replayStartIndex, cursorIndex - 1));
}

function jumpStart() {
  if (chartData.length === 0) return;
  stopTimer();
  mode = 'idle';
  renderSlice(replayStartIndex, true, true);
}

function jumpLastPosition() {
  if (chartData.length === 0 || lastCursorIndex < 0) return;
  stopTimer();
  mode = 'idle';
  renderSlice(lastCursorIndex, true, true);
}

function jumpNext0929() {
  if (!enabled || chartData.length === 0) return;

  const index = findNextDailyTimeIndex(9, 29);
  if (index < 0) {
    bus.emit('status:update', {
      text: 'Replay 跳转失败: 当前加载区间内没有下一日 09:29',
      isError: true,
    });
    return;
  }

  stopTimer();
  mode = 'idle';
  renderSlice(index, true, true);
  bus.emit('status:update', {
    text: `Replay 跳转到下一日 09:29: ${formatReplayTime(displayBars[index])}`,
    isError: false,
  });
}

function jumpToTime() {
  if (!enabled || chartData.length === 0) return;

  const input = controlsEl?.querySelector('[data-replay-jump-input]');
  if (!input) return;

  const { timestamp, formatted } = parseReplayJumpTimestamp(input.value);
  input.value = formatted;

  if (timestamp === null || Number.isNaN(timestamp)) {
    bus.emit('status:update', { text: 'Replay 跳转失败: 时间格式无效', isError: true });
    return;
  }

  const index = findBarIndexAtOrBeforeTimestamp(displayBars, timestamp, store.getCurrentTimeframe());
  if (index < 0) {
    bus.emit('status:update', {
      text: 'Replay 跳转失败: 时间不在当前加载区间',
      isError: true,
    });
    return;
  }

  stopTimer();
  mode = 'idle';
  renderSlice(index, true, true);
  bus.emit('status:update', {
    text: `Replay 跳转: ${formatReplayTime(displayBars[index])}`,
    isError: false,
  });
}

export function restoreReplayToTimestamp(timestamp, nextSpeedIndex = speedIndex, options = {}) {
  if (options.replayStartTimestamp !== undefined) {
    replayStartTimestampAnchor = normalizeTimestamp(options.replayStartTimestamp);
    replayStartIndex = resolveReplayStartIndex(replayStartTimestampAnchor);
  }
  const index = findBarIndexAtOrBeforeTimestamp(displayBars, timestamp, store.getCurrentTimeframe());
  if (index < 0) return false;
  stopTimer();
  speedIndex = Number.isFinite(Number(nextSpeedIndex)) ? Number(nextSpeedIndex) : speedIndex;
  mode = 'idle';
  renderSlice(Math.max(index, replayStartIndex), true, true);
  return true;
}

function activateReplayAtTimestamp({ timestamp, speedIndex: nextSpeedIndex, replayStartTimestamp } = {}) {
  if (restoreReplayToTimestamp(timestamp, nextSpeedIndex, { replayStartTimestamp })) return;
  bus.emit('status:update', { text: 'Replay 初始化失败: 时间不在当前加载窗口', isError: true });
}

function enableReplay() {
  if (chartData.length === 0) return;
  const startIndex = lastCursorIndex >= replayStartIndex ? lastCursorIndex : replayStartIndex;
  mode = 'idle';
  renderSlice(startIndex);
}

function toggleReplayEnabled() {
  if (enabled) {
    restoreFullChart(true);
  } else {
    enableReplay();
  }
}

function togglePlay() {
  if (!enabled || chartData.length === 0) return;

  if (timer) {
    stopTimer();
    setMode('idle');
    return;
  }

  if (cursorIndex < 0) {
    renderSlice(0);
  }

  mode = 'playing';
  timer = window.setInterval(stepForward, SPEEDS[speedIndex].ms);
  render();
}

function resumePlayback({ speedIndex: nextSpeedIndex } = {}) {
  if (!enabled || chartData.length === 0 || timer) return;
  speedIndex = Number.isFinite(Number(nextSpeedIndex)) ? Number(nextSpeedIndex) : speedIndex;
  mode = 'playing';
  timer = window.setInterval(stepForward, SPEEDS[speedIndex].ms);
  render();
}

function selectBar() {
  if (!enabled || chartData.length === 0) return;
  stopTimer();
  setMode('picking');
  bus.emit('status:update', { text: '点击图表选择 Replay 回退位置', isError: false });
}

function cancelPick() {
  if (mode !== 'picking') return false;

  chart.hidePickPreviewCursor();
  setMode('idle');
  bus.emit('status:update', { text: 'Replay Pick 已取消', isError: false });
  return true;
}

function findBarIndex(time) {
  if (time === undefined || time === null) return -1;
  const target = normalizeTimeKey(time);
  return chartData.findIndex((bar) => normalizeTimeKey(bar.time) === target);
}

function handleChartClick(param) {
  if (!enabled || mode !== 'picking') return;
  const index = findBarIndex(param?.time);
  if (index < 0) return;

  const currentRange = chart.getVisibleLogicalRange();
  const keepIndex = index - 1;
  chart.hidePickPreviewCursor();
  lastReplayPickHandledAt = Date.now();
  mode = 'idle';
  if (keepIndex < 0) {
    if (cursorIndex >= 0) {
      lastCursorIndex = cursorIndex;
      lastCursorTimestampAnchor = getCursorTimestamp();
    }
    enabled = true;
    cursorIndex = -1;
    cursorTimestampAnchor = null;
    chart.setData([]);
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
      ? `Replay 位置: 0/${chartData.length} before ${formatReplayTime(displayBars[index])}`
      : `Replay 位置: ${keepIndex + 1}/${chartData.length} before ${formatReplayTime(displayBars[index])}`,
    isError: false,
  });
}

function handleCrosshairMove(param) {
  if (!enabled || mode !== 'picking') {
    if (chart.hasPickPreviewCursor()) chart.hidePickPreviewCursor();
    return;
  }

  const index = findBarIndex(param?.time);
  if (index < 0) {
    if (chart.hasPickPreviewCursor()) chart.hidePickPreviewCursor();
    return;
  }

  chart.showPickPreviewCursor(chartData[index].time);
}

function handleControlClick(e) {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'history-toggle') {
    historyOpen = !historyOpen;
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
      setBars: (...args) => store.setBars(...args),
      applyComparisonState,
      restoreReplayToTimestamp,
      closeHistoryPanel: () => {
        historyOpen = false;
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
  speedIndex = Number(e.target.value);
  if (timer) {
    stopTimer();
    togglePlay();
  }
  emitReplayChanged();
  render();
}

function handleKeydown(e) {
  if (isTextEditingTarget(e.target) || !enabled || chartData.length === 0) return;

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

  const hasData = chartData.length > 0;
  const currentBar = cursorIndex >= 0 ? displayBars[cursorIndex] : null;
  const isPlaying = Boolean(timer);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const lastDisabled = !hasData || lastCursorIndex < 0;
  const history = getReplayHistory(getPrimaryInstrument());
  controlsEl.innerHTML = renderReplayControlsView({
    hasData,
    enabled,
    currentBar,
    cursorIndex: getReplayProgressIndex() - 1,
    dataCount: getReplayProgressCount(),
    isPlaying,
    tfLabel,
    mode,
    speedIndex,
    lastDisabled,
    historyOpen,
    history,
    speeds: SPEEDS,
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
  if (!enabled || cursorIndex < 0) return null;

  return {
    enabled: true,
    cursorTimestamp: getCursorTimestamp(),
    lastTimestamp: lastCursorIndex >= 0 ? getLastCursorTimestamp() : null,
    replayStartTimestamp: replayStartTimestampAnchor,
    sourceTimeframe: activeTimeframe,
    sourceBars: displayBars,
    visibleRange: chart.getVisibleLogicalRange(),
    dataCount: cursorIndex + 1,
  };
}

export function getReplayVisibleBars() {
  if (!enabled || cursorIndex < 0) return null;
  return displayBars.slice(0, cursorIndex + 1);
}

export function getReplayCursorTimestamp() {
  return enabled && cursorIndex >= 0 ? getCursorTimestamp() : null;
}

export function getReplayProgressSnapshot() {
  return {
    enabled,
    cursorIndex,
    replayStartIndex,
    progressIndex: getReplayProgressIndex(),
    progressCount: getReplayProgressCount(),
    cursorTimestamp: enabled && cursorIndex >= 0 ? getCursorTimestamp() : null,
    replayStartTimestamp: replayStartTimestampAnchor,
  };
}

export function isReplayPicking() {
  return enabled && mode === 'picking';
}

export function didReplayPickJustHandleClick() {
  return Date.now() - lastReplayPickHandledAt < 250;
}

export function syncReplayData(restoreSnapshot = null) {
  const shouldRestoreReplay =
    (restoreSnapshot?.enabled && restoreSnapshot.cursorTimestamp !== undefined) ||
    (enabled && cursorIndex >= 0);
  const cursorTimestamp = normalizeTimestamp(restoreSnapshot?.cursorTimestamp ?? getCursorTimestamp());
  const lastTimestamp =
    normalizeTimestamp(restoreSnapshot?.lastTimestamp ?? (lastCursorIndex >= 0 ? getLastCursorTimestamp() : null));
  const replayStartTimestamp = normalizeTimestamp(restoreSnapshot?.replayStartTimestamp ?? replayStartTimestampAnchor);

  stopTimer();
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  const nextTimeframe = store.getCurrentTimeframe();
  displayBars = getReplayRestoreDisplayBars(
    store.getDisplayBars(),
    nextTimeframe,
    cursorTimestamp,
    restoreSnapshot
  );
  chartData = displayBars.map(toChartBar);
  activeTimeframe = nextTimeframe;
  replayStartTimestampAnchor = replayStartTimestamp;
  replayStartIndex = resolveReplayStartIndex(replayStartTimestamp);

  if (shouldRestoreReplay && chartData.length > 0) {
    const restoredIndex = findBarIndexAtOrBeforeTimestamp(displayBars, cursorTimestamp, store.getCurrentTimeframe());
    if (restoredIndex >= 0) {
      lastCursorIndex = findBarIndexAtOrBeforeTimestamp(displayBars, lastTimestamp, store.getCurrentTimeframe());
      lastCursorTimestampAnchor = lastTimestamp;
      mode = 'idle';
      cursorIndex = -1;
      renderSlice(Math.max(restoredIndex, replayStartIndex), true, false, {
        ...restoreSnapshot,
        cursorTimestamp,
        lastTimestamp,
        replayStartTimestamp,
      });
      bus.emit('status:update', {
        text: `Replay 对齐: ${formatReplayTime(displayBars[restoredIndex])}`,
        isError: false,
      });
      return;
    }
  }

  enabled = false;
  mode = 'idle';
  cursorIndex = -1;
  lastCursorIndex = -1;
  cursorTimestampAnchor = null;
  lastCursorTimestampAnchor = null;
  replayStartTimestampAnchor = null;
  replayStartIndex = 0;
  if (restoreSnapshot?.enabled && chartData.length > 0) {
    chart.showStartOfData(chartData.length);
  }
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
  bus.on('replay:activate-at', activateReplayAtTimestamp);
  bus.on('replay:resume-playback', resumePlayback);
  render();
}
