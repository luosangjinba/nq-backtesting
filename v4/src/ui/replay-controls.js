// TradingView-style bar replay controls — minimal version.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';

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
let cursorIndex = -1;
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

function resetReplayState() {
  stopTimer();
  mode = 'idle';
  cursorIndex = -1;
  render();
}

function restoreFullChart() {
  stopTimer();
  mode = 'idle';
  cursorIndex = -1;
  if (chartData.length > 0) {
    chart.setData(chartData);
    chart.showStartOfData(chartData.length);
  }
  render();
}

function renderSlice(index, followEnd = true) {
  if (chartData.length === 0) return;
  cursorIndex = Math.max(0, Math.min(index, chartData.length - 1));
  chart.setData(chartData.slice(0, cursorIndex + 1));
  if (followEnd) {
    chart.showEndOfData(cursorIndex + 1);
  }
  render();
}

function stepForward() {
  if (chartData.length === 0) return;

  if (mode === 'idle') {
    setMode('replay');
    renderSlice(0);
    return;
  }

  if (cursorIndex >= chartData.length - 1) {
    stopTimer();
    setMode('replay');
    return;
  }

  cursorIndex += 1;
  chart.updateBar(chartData[cursorIndex]);
  chart.showEndOfData(cursorIndex + 1);
  render();
}

function stepBack() {
  if (chartData.length === 0) return;

  if (mode === 'idle') {
    setMode('replay');
    renderSlice(Math.max(0, chartData.length - 2));
    return;
  }

  renderSlice(Math.max(0, cursorIndex - 1));
}

function jumpStart() {
  if (chartData.length === 0) return;
  stopTimer();
  setMode('replay');
  renderSlice(0);
}

function togglePlay() {
  if (chartData.length === 0) return;

  if (timer) {
    stopTimer();
    setMode('replay');
    return;
  }

  if (mode === 'idle') {
    renderSlice(0);
  }

  mode = 'playing';
  timer = window.setInterval(stepForward, SPEEDS[speedIndex].ms);
  render();
}

function selectBar() {
  if (chartData.length === 0) return;
  stopTimer();
  setMode('selecting');
  bus.emit('status:update', { text: '点击图表选择 Replay 起点', isError: false });
}

function findBarIndex(time) {
  if (time === undefined || time === null) return -1;
  const target = normalizeTimeKey(time);
  return chartData.findIndex((bar) => normalizeTimeKey(bar.time) === target);
}

function handleChartClick(param) {
  if (mode !== 'selecting') return;
  const index = findBarIndex(param?.time);
  if (index < 0) return;

  setMode('replay');
  renderSlice(index);
  bus.emit('status:update', {
    text: `Replay 起点: ${formatReplayTime(displayBars[index])}`,
    isError: false,
  });
}

function handleControlClick(e) {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  if (action === 'select') selectBar();
  if (action === 'start') jumpStart();
  if (action === 'back') stepBack();
  if (action === 'play') togglePlay();
  if (action === 'forward') stepForward();
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

function render() {
  if (!controlsEl) return;

  const hasData = chartData.length > 0;
  const currentBar = cursorIndex >= 0 ? displayBars[cursorIndex] : null;
  const isPlaying = Boolean(timer);
  const tfLabel = timeframeToString(store.getCurrentTimeframe());

  controlsEl.innerHTML = `
    <div class="replay-main">
      <button class="replay-btn replay-select ${mode === 'selecting' ? 'active' : ''}" data-action="select" ${hasData ? '' : 'disabled'}>
        Select bar
      </button>
      <span class="replay-divider"></span>
      <button class="replay-icon-btn" data-action="start" title="回到起点" ${hasData ? '' : 'disabled'}>|&lt;</button>
      <button class="replay-icon-btn" data-action="back" title="上一根" ${hasData ? '' : 'disabled'}>&lt;</button>
      <button class="replay-icon-btn replay-play" data-action="play" title="${isPlaying ? '暂停' : '播放'}" ${hasData ? '' : 'disabled'}>
        ${isPlaying ? '||' : '▶'}
      </button>
      <button class="replay-icon-btn" data-action="forward" title="下一根" ${hasData ? '' : 'disabled'}>&gt;</button>
      <span class="replay-divider"></span>
      <select class="replay-speed" ${hasData ? '' : 'disabled'}>
        ${SPEEDS.map(
          (s, i) => `<option value="${i}"${i === speedIndex ? ' selected' : ''}>${s.label}</option>`
        ).join('')}
      </select>
      <span class="replay-tf">${tfLabel}</span>
      <span class="replay-info">${currentBar ? `${cursorIndex + 1}/${chartData.length} ${formatReplayTime(currentBar)}` : 'Replay Trading'}</span>
      <button class="replay-close" data-action="close" title="退出 Replay" ${hasData ? '' : 'disabled'}>X</button>
    </div>
  `;

  controlsEl.querySelector('.replay-speed')?.addEventListener('change', handleSpeedChange);
}

export function syncReplayData() {
  stopTimer();
  displayBars = store.getDisplayBars();
  chartData = displayBars.map(toChartBar);
  mode = 'idle';
  cursorIndex = -1;
  render();
}

export function initReplayControls() {
  controlsEl = document.getElementById('replay-controls');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  chart.onClick(handleChartClick);
  bus.on('bars:cleared', resetReplayState);
  render();
}
