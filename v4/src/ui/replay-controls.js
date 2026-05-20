// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { formatTimeInput } from '../utils.js';

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

function toChartBar(bar) {
  const tf = store.getCurrentTimeframe();
  return {
    time: tf === 1440 ? bar.tradingDay : bar.timestamp,
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

function parseReplayJumpTimestamp(value) {
  const formatted = formatTimeInput(value.trim());
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return { timestamp: null, formatted };

  const [, year, month, day, hour, minute] = match;
  const timestamp = Math.floor(
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    ).getTime() / 1000
  );

  return { timestamp, formatted };
}

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function stopTimer() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
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
  enabled = false;
  mode = 'idle';
  cursorIndex = -1;
  lastCursorIndex = -1;
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
  chart.hideReplayCursor();
  if (chartData.length > 0) {
    chart.setData(chartData);
    chart.showStartOfData(chartData.length);
  }
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
  setMode('picking');
  bus.emit('status:update', { text: '点击图表选择 Replay 回退位置', isError: false });
}

function cancelPick() {
  if (mode !== 'picking') return false;

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

  mode = 'idle';
  renderSlice(index, true, true);
  bus.emit('status:update', {
    text: `Replay 位置: ${formatReplayTime(displayBars[index])}`,
    isError: false,
  });
}

function handleControlClick(e) {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'toggle') toggleReplayEnabled();
  if (action === 'pick') selectBar();
  if (action === 'first') jumpStart();
  if (action === 'last') jumpLastPosition();
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

  controlsEl.innerHTML = `
    <div class="replay-main">
      <button class="replay-btn replay-toggle ${enabled ? 'active' : ''}" data-action="toggle" ${hasData ? '' : 'disabled'}>
        Replay Bar ${enabled ? 'On' : 'Off'}
      </button>
      <span class="replay-divider"></span>
      <button class="replay-btn replay-action" data-action="first" title="回退到区间第一根K线" ${replayDisabled ? 'disabled' : ''}>First</button>
      <button class="replay-btn replay-action" data-action="last" title="回到上次操作位置" ${lastDisabled ? 'disabled' : ''}>Last Pos</button>
      <button class="replay-btn replay-action ${mode === 'picking' ? 'active' : ''}" data-action="pick" title="点击图表选择回退位置" ${replayDisabled ? 'disabled' : ''}>Pick</button>
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
      <span class="replay-tf">${tfLabel}</span>
      <span class="replay-info">${enabled && currentBar ? `${cursorIndex + 1}/${chartData.length} ${formatReplayTime(currentBar)}` : 'Replay Trading'}</span>
      <button class="replay-close" data-action="close" title="退出 Replay" ${replayDisabled ? 'disabled' : ''}>X</button>
    </div>
  `;

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
    cursorTimestamp: displayBars[cursorIndex]?.timestamp,
    lastTimestamp: lastCursorIndex >= 0 ? displayBars[lastCursorIndex]?.timestamp : null,
    visibleRange: chart.getVisibleLogicalRange(),
    dataCount: cursorIndex + 1,
  };
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
  displayBars = store.getDisplayBars();
  chartData = displayBars.map(toChartBar);

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
  bus.on('bars:cleared', resetReplayState);
  render();
}
