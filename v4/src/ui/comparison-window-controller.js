import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import { TIMEFRAME_MAP } from '../config.js';
import {
  clearComparisonData,
  getComparisonChart,
  hideComparisonCursor,
  initComparisonChart,
  onComparisonCrosshairMove,
  setComparisonChartInfo,
  setComparisonData,
  showComparisonCursor,
  showComparisonEndOfData,
  showComparisonStartOfData,
} from '../chart/comparison-chart-manager.js';
import * as chart from '../chart/chart-manager.js';
import { getBarChartTime, mapTimestampToChartTime } from '../chart/time-projection.js';
import { validateSingleWindowRange } from '../data/load-range-policy.js';
import * as primaryStore from '../data/bar-store.js';
import {
  getComparisonWindowState,
  clearComparisonBars,
  resetComparisonVisibleWindow,
  setComparisonInstrument,
  setComparisonBars,
  setComparisonOverlaySyncMode,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} from '../comparison/comparison-window-store.js';
import { updateComparisonOverlayStatus } from '../comparison/comparison-overlay-policy.js';
import { getReplaySyncedComparisonBars } from '../comparison/comparison-replay-sync.js';
import {
  renderComparisonWindowTemplate,
  syncComparisonHeaderControls,
} from './comparison/comparison-window-view.js';
import {
  createComparisonWindowDragHandlers,
  syncComparisonLayoutGeometry,
} from './comparison/comparison-window-layout.js';
import { createComparisonCrosshairSync } from './comparison/comparison-crosshair-sync.js';

let root = null;
let windowEl = null;
let requestSeq = 0;
let lastLoadSignature = null;
let lastReplayState = { enabled: false, cursorTimestamp: null };
let replaySourceBars = [];
let replaySourceRequestedRange = null;
let layoutResizeObserver = null;
let layoutRefreshFrame = null;
const dragHandlers = createComparisonWindowDragHandlers({
  getRoot: () => root,
  getWindowEl: () => windowEl,
  getState: getComparisonWindowState,
  updateVisibleWindow: updateComparisonVisibleWindow,
  resetVisibleWindow: resetComparisonVisibleWindow,
});
const crosshairSync = createComparisonCrosshairSync({
  getReplaySyncedBars,
});

function shouldLoadReplaySource(start, end, timeframe) {
  if (Number(timeframe) <= 1) return false;
  return validateSingleWindowRange(start, end, 1).ok;
}

export function initComparisonWindowController() {
  ensureDom();
  render(getComparisonWindowState());
  bus.emit('comparison-window:dom-ready', getComparisonWindowState());
  bus.on('comparison-window:changed', render);
  bus.on('comparison-window:changed', handleComparisonChanged);
  bus.on('bars:loaded', () => loadComparisonForPrimaryRange({ force: true }));
  bus.on('bars:cleared', clearComparisonView);
  bus.on('replay:changed', handleReplayChanged);
  chart.onCrosshairMove((param) => crosshairSync.scheduleComparisonHoverCursor(param?.time));
  onComparisonCrosshairMove((param) => crosshairSync.schedulePrimaryHoverCursor(param?.time));
  window.addEventListener('resize', scheduleComparisonLayoutRefresh);
}

function ensureDom() {
  if (root) return;
  const host = document.getElementById('chart-stack');
  if (!host) return;
  root = document.createElement('div');
  root.id = 'comparison-window-root';
  root.className = 'comparison-window-root';
  root.hidden = true;
  root.innerHTML = renderComparisonWindowTemplate();
  host.appendChild(root);
  windowEl = root.querySelector('#comparison-window');
  layoutResizeObserver = new ResizeObserver(scheduleComparisonLayoutRefresh);
  layoutResizeObserver.observe(host);
  root.querySelector('[data-comparison-close]')?.addEventListener('click', () => {
    setComparisonWindowEnabled(false);
  });
  root.querySelector('[data-comparison-reset]')?.addEventListener('click', () => {
    resetComparisonVisibleWindow();
  });
  root.querySelector('[data-comparison-instrument]')?.addEventListener('change', (event) => {
    setComparisonInstrument(event.target.value);
  });
  root.querySelector('[data-comparison-timeframe]')?.addEventListener('change', (event) => {
    setComparisonTimeframe(event.target.value);
  });
  root.querySelector('[data-comparison-overlay-sync]')?.addEventListener('change', (event) => {
    setComparisonOverlaySyncMode(event.target.value);
  });
  root.querySelectorAll('[data-comparison-drag-handle]').forEach((handle) => {
    handle.addEventListener('pointerdown', dragHandlers.startDrag);
    handle.addEventListener('dblclick', () => resetComparisonVisibleWindow());
  });
  const leftHandle = root.querySelector('[data-comparison-left-handle]');
  leftHandle?.addEventListener('pointerdown', dragHandlers.startSlideResize);
  leftHandle?.addEventListener('contextmenu', dragHandlers.suppressComparisonDragEvent);
  leftHandle?.addEventListener('dblclick', (event) => {
    dragHandlers.suppressComparisonDragEvent(event);
    resetComparisonVisibleWindow();
  });
}

function render(state) {
  ensureDom();
  if (!root || !windowEl) return;
  syncComparisonLayoutGeometry({ root, windowEl, state });
  if (!state.enabled) return;
  const { instrument, timeframe, syncMode, overlaySyncMode } = state.descriptor;
  windowEl.dataset.instrument = instrument;
  windowEl.dataset.timeframe = String(timeframe);
  windowEl.dataset.syncMode = syncMode;
  windowEl.dataset.overlaySyncMode = overlaySyncMode;
  syncComparisonHeaderControls(root, state.descriptor);
  requestAnimationFrame(() => {
    initComparisonChart();
    setComparisonChartInfo({ instrument, timeframe });
  });
}

function scheduleComparisonLayoutRefresh() {
  if (layoutRefreshFrame !== null) return;
  layoutRefreshFrame = requestAnimationFrame(() => {
    layoutRefreshFrame = null;
    const state = getComparisonWindowState();
    syncComparisonLayoutGeometry({ root, windowEl, state });
  });
}

function handleComparisonChanged(state) {
  if (!state.enabled) {
    requestSeq += 1;
    lastLoadSignature = null;
    return;
  }
  loadComparisonForPrimaryRange();
}

function getDisplayBarsFromResult(result) {
  const bars = Array.isArray(result?.bars) ? result.bars : [];
  const range = result?.requestedRange;
  if (!range || bars.length === 0) return bars;
  const { startTs, endTs } = range;
  return bars.filter((bar) => Number(bar?.timestamp) >= startTs && Number(bar?.timestamp) <= endTs);
}

function toChartBar(bar, timeframe) {
  return {
    time: getBarChartTime(bar, timeframe),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  };
}

function getReplaySyncedBars(displayBars, timeframe) {
  return getReplaySyncedComparisonBars({
    displayBars,
    timeframe,
    replayEnabled: lastReplayState.enabled,
    cursorTimestamp: lastReplayState.cursorTimestamp,
    replaySourceBars,
    replaySourceRequestedRange,
  });
}

function mapTimestampToComparisonChartTime(timestamp, timeframe, displayBars) {
  return mapTimestampToChartTime(timestamp, timeframe, displayBars);
}

function syncComparisonReplayCursor(timeframe, displayBars) {
  if (!lastReplayState.enabled || lastReplayState.cursorTimestamp === null) {
    hideComparisonCursor();
    return;
  }
  const cursorTime = mapTimestampToComparisonChartTime(lastReplayState.cursorTimestamp, timeframe, displayBars);
  if (cursorTime === null) {
    hideComparisonCursor();
    return;
  }
  showComparisonCursor(cursorTime);
}

function renderComparisonBars({ followReplay = false } = {}) {
  const state = getComparisonWindowState();
  if (!state.enabled) return;
  initComparisonChart();
  const { instrument, timeframe } = state.descriptor;
  setComparisonChartInfo({ instrument, timeframe });
  const displayBars = state.displayBars || [];
  const syncedBars = getReplaySyncedBars(displayBars, timeframe);
  const chartData = syncedBars.map((bar) => toChartBar(bar, timeframe));
  const previousRange = getComparisonChart()?.timeScale?.().getVisibleLogicalRange?.() || null;
  setComparisonData(chartData);
  if (lastReplayState.enabled || followReplay) {
    showComparisonEndOfData(chartData.length, previousRange, null);
  } else {
    showComparisonStartOfData(chartData.length);
  }
  syncComparisonReplayCursor(timeframe, syncedBars);
  if (chartData.length > 0) {
    hideComparisonPlaceholder();
  }
}

function setComparisonStatus(text, isError = false) {
  const statusEl = root?.querySelector('[data-comparison-status]');
  const placeholder = root?.querySelector('[data-comparison-placeholder]');
  if (statusEl) statusEl.textContent = text;
  if (placeholder) {
    placeholder.hidden = false;
    placeholder.classList.toggle('comparison-window-placeholder-error', Boolean(isError));
  }
}

function hideComparisonPlaceholder() {
  const placeholder = root?.querySelector('[data-comparison-placeholder]');
  if (placeholder) placeholder.hidden = true;
}

function clearComparisonView() {
  requestSeq += 1;
  lastLoadSignature = null;
  clearComparisonBars();
  replaySourceBars = [];
  replaySourceRequestedRange = null;
  clearComparisonData();
  setComparisonStatus('Choose a main date range to load comparison data');
  updateComparisonOverlayStatus();
}

async function loadComparisonForPrimaryRange({ force = false } = {}) {
  const state = getComparisonWindowState();
  if (!state.enabled) return;
  const { start, end } = primaryStore.getCurrentRange();
  if (!start || !end) {
    clearComparisonView();
    return;
  }

  const { instrument, timeframe } = state.descriptor;
  const loadSignature = `${start}|${end}|${instrument}|${timeframe}`;
  if (!force && loadSignature === lastLoadSignature) return;
  lastLoadSignature = loadSignature;
  const seq = (requestSeq += 1);
  setComparisonStatus(`Loading ${instrument} ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}...`);
  try {
    initComparisonChart();
    setComparisonChartInfo({ instrument, timeframe });
    const shouldLoadSource = shouldLoadReplaySource(start, end, timeframe);
    const [result, replaySourceResult] = await Promise.all([
      fetchBars(start, end, timeframe, instrument),
      shouldLoadSource ? fetchBars(start, end, 1, instrument) : Promise.resolve(null),
    ]);
    if (seq !== requestSeq || !getComparisonWindowState().enabled) return;
    replaySourceBars = replaySourceResult?.bars || [];
    replaySourceRequestedRange = replaySourceResult?.requestedRange || null;
    setComparisonBars(result.bars, result.requestedRange, { start, end });
    const displayBars = getDisplayBarsFromResult(result);
    renderComparisonBars();
    if (displayBars.length > 0) {
      hideComparisonPlaceholder();
    } else {
      setComparisonStatus(`No ${instrument} data in main range`);
    }
    updateComparisonOverlayStatus();
    bus.emit('status:update', {
      text: `Comparison ${instrument} 已加载 ${displayBars.length} 根K线`,
      isError: false,
    });
  } catch (error) {
    if (seq !== requestSeq) return;
    lastLoadSignature = null;
    clearComparisonBars();
    replaySourceBars = [];
    replaySourceRequestedRange = null;
    clearComparisonData();
    setComparisonStatus(`Comparison load failed: ${error.message}`, true);
    updateComparisonOverlayStatus();
    bus.emit('status:update', {
      text: `Comparison 加载失败: ${error.message}`,
      isError: true,
    });
  }
}

function handleReplayChanged({ enabled, cursorTimestamp }) {
  lastReplayState = {
    enabled: Boolean(enabled),
    cursorTimestamp: cursorTimestamp ?? null,
  };
  renderComparisonBars({ followReplay: true });
}
