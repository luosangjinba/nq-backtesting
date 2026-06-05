// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as chart from '../chart/chart-manager.js';
import { findDisplayBarFast } from '../chart/display-bar-lookup.js';
import { getBarChartTime } from '../chart/time-projection.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { resolveWindowAroundTimestamp } from '../data/load-range-policy.js';
import { timeframeToString } from '../config.js';
import { formatTimeInput } from '../utils.js';
import { createRafThrottle } from '../utils/raf-throttle.js';
import {
  clearReplayHistory,
  deleteReplayHistoryItem,
  getReplayHistory,
} from './replay-history-store.js';

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
let speedIndex = 2;
let timer = null;
let historyOpen = false;
let pickViewportSnapshot = null;

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

function formatReplayTime(bar) {
  if (!bar) return '--';
  return bar.tradingDay || bar.time || '--';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatHistoryTime(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '--';
  const date = new Date(Number(timestamp) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function formatHistoryDateRange(start, end) {
  const startDate = String(start || '').slice(0, 10);
  const endDate = String(end || '').slice(0, 10);
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return start || end || '--';
}

function formatSplitLabel(split) {
  if (!split?.enabled) return 'Split Off';
  const tf = timeframeToString(split.timeframe);
  return `${split.instrument} ${tf} ${split.layout}`;
}

function parseDateTime(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0
  );
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isTimestampInRange(timestamp, start, end) {
  const startMs = parseDateTime(start);
  const endMs = parseDateTime(end);
  const targetMs = Number(timestamp) * 1000;
  return (
    startMs !== null &&
    endMs !== null &&
    Number.isFinite(targetMs) &&
    targetMs >= startMs &&
    targetMs <= endMs
  );
}

function setToolbarRange(start, end, timeframe) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
  if (tfSelect && timeframe) tfSelect.value = String(timeframe);
}

function applySplitState(split) {
  if (!split?.enabled) {
    secondaryStore.setSecondaryEnabled(false);
    secondaryStore.setSplitLayout(split?.layout);
    secondaryStore.setSecondaryInstrument(split?.instrument);
    secondaryStore.setSecondaryTimeframe(split?.timeframe);
    return;
  }

  secondaryStore.setSplitLayout(split.layout);
  secondaryStore.setSecondaryInstrument(split.instrument);
  secondaryStore.setSecondaryTimeframe(split.timeframe);
  secondaryStore.setSecondaryEnabled(true);
}

function findBarIndexAtOrBeforeTimestamp(bars, targetTimestamp) {
  if (!bars.length || targetTimestamp === null || targetTimestamp === undefined) return -1;
  const tfSeconds = store.getCurrentTimeframe() * 60;
  const firstTimestamp = bars[0].timestamp;
  const lastTimestamp = bars[bars.length - 1].timestamp;

  if (targetTimestamp < firstTimestamp || targetTimestamp >= lastTimestamp + tfSeconds) {
    return -1;
  }

  let matchedIndex = -1;
  for (let i = 0; i < bars.length; i += 1) {
    if (bars[i].timestamp > targetTimestamp) break;
    matchedIndex = i;
  }

  return matchedIndex;
}

function getUtcDateKey(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '';
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
}

function getUtcDateTimeTimestamp(dateKey, hour, minute) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return Math.floor(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hour,
    minute,
    0
  ) / 1000);
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
    const targetIndex = findBarIndexAtOrBeforeTimestamp(displayBars, targetTimestamp);
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

function parseReplayJumpTimestamp(value) {
  const formatted = formatTimeInput(value.trim());
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return { timestamp: null, formatted };

  const [, year, month, day, hour, minute] = match;
  const timestamp = Math.floor(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    ) / 1000
  );

  return { timestamp, formatted };
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function emitReplayChanged() {
  bus.emit('replay:changed', {
    enabled,
    cursorIndex,
    cursorTimestamp: enabled && cursorIndex >= 0 ? displayBars[cursorIndex]?.timestamp : null,
    speedIndex,
  });
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
  pickViewportSnapshot = null;
  render();
}

function restoreFullChart(savePosition = true) {
  stopTimer();
  if (savePosition && cursorIndex >= 0) {
    lastCursorIndex = cursorIndex;
  }
  enabled = false;
  mode = 'idle';
  cursorIndex = -1;
  pickViewportSnapshot = null;
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
  }
  enabled = true;
  mode = mode === 'playing' ? 'playing' : 'idle';
  cursorIndex = Math.max(0, Math.min(index, chartData.length - 1));
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

  if (cursorIndex < 0) renderSlice(0);

  if (cursorIndex >= chartData.length - 1) {
    stopTimer();
    setMode('idle');
    return;
  }

  const previousRange = chart.getVisibleLogicalRange();
  const previousDataCount = cursorIndex + 1;
  cursorIndex += 1;
  chart.updateBar(chartData[cursorIndex]);
  chart.showEndOfData(cursorIndex + 1, previousRange, previousDataCount);
  chart.showReplayCursor(chartData[cursorIndex].time);
  emitReplayChanged();
  render();
}

function stepBack() {
  if (!enabled || chartData.length === 0) return;

  renderSlice(Math.max(0, cursorIndex - 1));
}

function jumpStart() {
  if (chartData.length === 0) return;
  stopTimer();
  mode = 'idle';
  renderSlice(0, true, true);
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

  const index = findBarIndexAtOrBeforeTimestamp(displayBars, timestamp);
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

export function restoreReplayToTimestamp(timestamp, nextSpeedIndex = speedIndex) {
  const index = findBarIndexAtOrBeforeTimestamp(displayBars, timestamp);
  if (index < 0) return false;
  stopTimer();
  speedIndex = Number.isFinite(Number(nextSpeedIndex)) ? Number(nextSpeedIndex) : speedIndex;
  mode = 'idle';
  renderSlice(index, true, true);
  return true;
}

async function loadReplayHistoryItem(id) {
  const item = getReplayHistory().find((historyItem) => historyItem.id === id);
  if (!item) {
    bus.emit('status:update', { text: 'Replay History item not found', isError: true });
    return;
  }

  const cursorTimestamp = item.replay.cursorTimestamp;
  let loadStart = item.primary.start;
  let loadEnd = item.primary.end;
  let outerRange = item.primary.outerRange;
  const timeframe = Number(item.primary.timeframe);

  if (!isTimestampInRange(cursorTimestamp, loadStart, loadEnd) && outerRange) {
    const resolved = resolveWindowAroundTimestamp(outerRange, cursorTimestamp);
    if (!resolved.ok) {
      bus.emit('status:update', { text: resolved.message, isError: true });
      return;
    }
    loadStart = resolved.start;
    loadEnd = resolved.end;
    outerRange = resolved.outerRange;
  }

  bus.emit('status:update', { text: '恢复 Replay History...', isError: false });
  try {
    const result = await fetchBars(loadStart, loadEnd, timeframe, item.primary.instrument);
    setToolbarRange(loadStart, loadEnd, timeframe);
    store.setBars(result.bars, loadStart, loadEnd, timeframe, result.requestedRange, { outerRange });

    applySplitState(item.split);

    if (!restoreReplayToTimestamp(cursorTimestamp, item.replay.speedIndex)) {
      bus.emit('status:update', { text: 'Replay History restore failed: cursor is outside loaded window', isError: true });
      return;
    }
    historyOpen = false;
    render();
    bus.emit('status:update', { text: `Replay History restored: ${item.label}`, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `Replay History restore failed: ${err.message}`, isError: true });
  }
}

function enableReplay() {
  if (chartData.length === 0) return;
  const startIndex = lastCursorIndex >= 0 ? lastCursorIndex : 0;
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

function selectBar() {
  if (!enabled || chartData.length === 0) return;
  stopTimer();
  pickViewportSnapshot = {
    visibleRange: chart.getVisibleLogicalRange(),
    dataCount: cursorIndex + 1,
  };
  chart.setData(chartData);
  if (cursorIndex >= 0) chart.showReplayCursor(chartData[cursorIndex].time);
  chart.fitContent();
  setMode('picking');
  bus.emit('status:update', { text: '点击图表选择 Replay 回退位置', isError: false });
}

function cancelPick() {
  if (mode !== 'picking') return false;

  chart.hidePickPreviewCursor();
  if (cursorIndex >= 0) {
    const snapshot = pickViewportSnapshot;
    mode = 'idle';
    pickViewportSnapshot = null;
    renderSlice(cursorIndex, false, false, snapshot);
    if (snapshot?.visibleRange) {
      chart.setVisibleLogicalRange(snapshot.visibleRange.from, snapshot.visibleRange.to);
    }
  } else {
    pickViewportSnapshot = null;
    setMode('idle');
  }
  bus.emit('status:update', { text: 'Replay Pick 已取消', isError: false });
  return true;
}

function findBarIndex(time) {
  if (time === undefined || time === null) return -1;
  const bar = findDisplayBarFast(displayBars, time, store.getCurrentTimeframe());
  return bar ? displayBars.indexOf(bar) : -1;
}

function handleChartClick(param) {
  if (!enabled || mode !== 'picking') return;
  const index = findBarIndex(param?.time);
  if (index < 0) return;

  const currentRange = chart.getVisibleLogicalRange();
  chart.hidePickPreviewCursor();
  pickViewportSnapshot = null;
  mode = 'idle';
  renderSlice(index, false, true);
  if (currentRange) {
    chart.setVisibleLogicalRange(currentRange.from, currentRange.to);
  }
  bus.emit('status:update', {
    text: `Replay 位置: ${index + 1}/${chartData.length} ${formatReplayTime(displayBars[index])}`,
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

const handleCrosshairMoveThrottled = createRafThrottle(handleCrosshairMove);

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
    clearReplayHistory();
    render();
    return;
  }
  if (action === 'history-load') {
    const id = e.target.closest('[data-history-id]')?.dataset.historyId;
    loadReplayHistoryItem(id);
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
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (!cancelPick()) {
      restoreFullChart();
    }
  }
}

function render() {
  if (!controlsEl) return;

  const hasData = chartData.length > 0;
  const currentBar = cursorIndex >= 0 ? displayBars[cursorIndex] : null;
  const isPlaying = Boolean(timer);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());
  const replayDisabled = !hasData || !enabled;
  const lastDisabled = !hasData || lastCursorIndex < 0;
  const history = getReplayHistory();
  const historyPanel = historyOpen ? renderHistoryPanel(history) : '';

  controlsEl.innerHTML = `
    <div class="replay-main">
      <button class="replay-btn replay-toggle ${enabled ? 'active' : ''}" data-action="toggle" ${hasData ? '' : 'disabled'}>
        Replay Bar ${enabled ? 'On' : 'Off'}
      </button>
      <span class="replay-divider"></span>
      <button class="replay-btn replay-action" data-action="first" title="回退到区间第一根K线" ${replayDisabled ? 'disabled' : ''}>First</button>
      <button class="replay-btn replay-action" data-action="last" title="回到上次操作位置" ${lastDisabled ? 'disabled' : ''}>Last Pos</button>
      <button class="replay-btn replay-action ${mode === 'picking' ? 'active' : ''}" data-action="pick" title="点击图表选择回退位置" ${replayDisabled ? 'disabled' : ''}>Pick</button>
      <button class="replay-btn replay-action" data-action="next-0929" title="跳转到下一日 09:29" ${replayDisabled ? 'disabled' : ''}>Next 09:29</button>
      <span class="replay-divider"></span>
      <button class="replay-icon-btn" data-action="back" title="上一根" ${replayDisabled ? 'disabled' : ''}>&lt;</button>
      <button class="replay-icon-btn replay-play" data-action="play" title="${isPlaying ? '暂停' : '播放'}" ${replayDisabled ? 'disabled' : ''}>
        ${isPlaying ? '||' : '▶'}
      </button>
      <button class="replay-icon-btn" data-action="forward" title="下一根" ${replayDisabled ? 'disabled' : ''}>&gt;</button>
      <span class="replay-divider"></span>
      <select class="replay-speed" ${replayDisabled ? 'disabled' : ''}>
        ${SPEEDS.map(
          (s, i) => `<option value="${i}"${i === speedIndex ? ' selected' : ''}>${s.label}</option>`
        ).join('')}
      </select>
      <input
        class="replay-jump-input"
        data-replay-jump-input
        type="text"
        placeholder="YYYY-MM-DD HH:mm"
        title="跳转到指定时间"
        ${replayDisabled ? 'disabled' : ''}
      />
      <button class="replay-btn replay-jump-btn" data-action="jump" title="跳转到指定时间" ${replayDisabled ? 'disabled' : ''}>Go</button>
      <button class="replay-btn replay-history-toggle ${historyOpen ? 'active' : ''}" data-action="history-toggle" title="Replay History">History</button>
      <span class="replay-tf">${tfLabel}</span>
      <span class="replay-info">${enabled && currentBar ? `${cursorIndex + 1}/${chartData.length} ${formatReplayTime(currentBar)}` : 'Replay Trading'}</span>
      <button class="replay-close" data-action="close" title="退出 Replay" ${replayDisabled ? 'disabled' : ''}>X</button>
    </div>
    ${historyPanel}
  `;

  controlsEl.querySelector('.replay-speed')?.addEventListener('change', handleSpeedChange);
  controlsEl.querySelector('[data-replay-jump-input]')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      jumpToTime();
    }
  });
}

function renderHistoryPanel(history) {
  const rows = history.length
    ? history.map((item) => `
      <div class="replay-history-row" data-history-id="${escapeHtml(item.id)}">
        <div class="replay-history-summary">
          <div class="replay-history-title">${escapeHtml(item.label || formatHistoryTime(item.replay.cursorTimestamp))}</div>
          <div class="replay-history-meta">${escapeHtml(formatHistoryDateRange(item.primary.start, item.primary.end))} · ${escapeHtml(formatSplitLabel(item.split))}</div>
        </div>
        <button class="replay-history-action" data-action="history-load" type="button">Load</button>
        <button class="replay-history-action" data-action="history-delete" type="button">Delete</button>
      </div>
    `).join('')
    : '<div class="replay-history-empty">No replay history.</div>';

  return `
    <div class="replay-history-panel">
      <div class="replay-history-header">
        <span>Replay History</span>
        <button class="replay-history-clear" data-action="history-clear" type="button" ${history.length ? '' : 'disabled'}>Clear</button>
      </div>
      <div class="replay-history-list">${rows}</div>
    </div>
  `;
}

export function getReplayRestoreSnapshot() {
  if (!enabled || cursorIndex < 0) return null;

  return {
    enabled: true,
    cursorTimestamp: displayBars[cursorIndex]?.timestamp,
    lastTimestamp: lastCursorIndex >= 0 ? displayBars[lastCursorIndex]?.timestamp : null,
    visibleRange: chart.getVisibleLogicalRange(),
    dataCount: cursorIndex + 1,
  };
}

export function getReplayVisibleBars() {
  if (!enabled || cursorIndex < 0) return null;
  return displayBars.slice(0, cursorIndex + 1);
}

export function syncReplayData(restoreSnapshot = null) {
  const shouldRestoreReplay =
    (restoreSnapshot?.enabled && restoreSnapshot.cursorTimestamp !== undefined) ||
    (enabled && cursorIndex >= 0);
  const cursorTimestamp = restoreSnapshot?.cursorTimestamp ?? displayBars[cursorIndex]?.timestamp;
  const lastTimestamp =
    restoreSnapshot?.lastTimestamp ?? (lastCursorIndex >= 0 ? displayBars[lastCursorIndex]?.timestamp : null);

  stopTimer();
  chart.hideReplayCursor();
  chart.hidePickPreviewCursor();
  displayBars = store.getDisplayBars();
  chartData = displayBars.map(toChartBar);
  pickViewportSnapshot = null;

  if (shouldRestoreReplay && chartData.length > 0) {
    const restoredIndex = findBarIndexAtOrBeforeTimestamp(displayBars, cursorTimestamp);
    if (restoredIndex >= 0) {
      lastCursorIndex = findBarIndexAtOrBeforeTimestamp(displayBars, lastTimestamp);
      mode = 'idle';
      cursorIndex = -1;
      renderSlice(restoredIndex, true, false, restoreSnapshot);
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
  if (restoreSnapshot?.enabled && chartData.length > 0) {
    chart.showStartOfData(chartData.length);
  }
  render();
}

export function initReplayControls() {
  controlsEl = document.getElementById('replay-controls');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  window.addEventListener('keydown', handleKeydown);
  chart.onClick(handleChartClick);
  chart.onCrosshairMove(handleCrosshairMoveThrottled);
  bus.on('bars:cleared', resetReplayState);
  render();
}
