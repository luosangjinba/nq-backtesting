import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import { TIMEFRAME_MAP } from '../config.js';
import {
  clearComparisonData,
  getComparisonChart,
  hideComparisonCursor,
  hideComparisonSyncCrosshairCursor,
  initComparisonChart,
  onComparisonCrosshairMove,
  setComparisonChartInfo,
  setComparisonData,
  showComparisonCursor,
  showComparisonEndOfData,
  showComparisonSyncCrosshairCursor,
  showComparisonStartOfData,
} from '../chart/comparison-chart-manager.js';
import * as chart from '../chart/chart-manager.js';
import { findDisplayBarFast, resolveExistingChartTimeFast } from '../chart/display-bar-lookup.js';
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

let root = null;
let windowEl = null;
let dragState = null;
let requestSeq = 0;
let lastLoadSignature = null;
let lastReplayState = { enabled: false, cursorTimestamp: null };
let replaySourceBars = [];
let replaySourceRequestedRange = null;
let pendingPrimaryHoverTime = null;
let pendingComparisonHoverTime = null;
let primaryHoverFrame = null;
let comparisonHoverFrame = null;
let layoutResizeObserver = null;
let layoutRefreshFrame = null;

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
  chart.onCrosshairMove((param) => scheduleComparisonHoverCursor(param?.time));
  onComparisonCrosshairMove((param) => schedulePrimaryHoverCursor(param?.time));
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
    handle.addEventListener('pointerdown', startDrag);
    handle.addEventListener('dblclick', () => resetComparisonVisibleWindow());
  });
  const leftHandle = root.querySelector('[data-comparison-left-handle]');
  leftHandle?.addEventListener('pointerdown', startSlideResize);
  leftHandle?.addEventListener('contextmenu', suppressComparisonDragEvent);
  leftHandle?.addEventListener('dblclick', (event) => {
    suppressComparisonDragEvent(event);
    resetComparisonVisibleWindow();
  });
}

function render(state) {
  ensureDom();
  if (!root || !windowEl) return;
  syncComparisonLayoutGeometry(state);
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

function syncComparisonLayoutGeometry(state = getComparisonWindowState()) {
  if (!root || !windowEl) return;
  const host = document.getElementById('chart-stack');
  root.hidden = !state.enabled;
  if (!state.enabled) {
    host?.style.setProperty('--primary-legend-left-offset', '0px');
    host?.style.setProperty('--primary-viewport-center-left', '50%');
    return;
  }
  const { visibleWindow, layoutMode } = state.descriptor;
  const isSliding = layoutMode === 'sliding';
  const rootRect = root.getBoundingClientRect();
  const boundaryPx = isSliding
    ? ((Number(visibleWindow.x) + Number(visibleWindow.width)) / 100) * rootRect.width
    : 0;
  host?.style.setProperty('--primary-legend-left-offset', `${Math.max(0, Math.round(boundaryPx))}px`);
  root.style.setProperty('--comparison-viewport-center-left', `${Math.max(0, Math.round(boundaryPx / 2))}px`);
  const mainCenterPx = isSliding ? boundaryPx + Math.max(0, rootRect.width - boundaryPx) / 2 : rootRect.width / 2;
  host?.style.setProperty('--primary-viewport-center-left', `${Math.max(0, Math.round(mainCenterPx))}px`);
  windowEl.classList.toggle('comparison-window-sliding', isSliding);
  windowEl.classList.toggle('comparison-window-floating', !isSliding);
  windowEl.style.left = `${visibleWindow.x}%`;
  windowEl.style.top = `${visibleWindow.y}%`;
  windowEl.style.right = 'auto';
  windowEl.style.width = `${visibleWindow.width}%`;
  windowEl.style.height = `${visibleWindow.height}%`;
  windowEl.dataset.layoutMode = layoutMode;
}

function scheduleComparisonLayoutRefresh() {
  if (layoutRefreshFrame !== null) return;
  layoutRefreshFrame = requestAnimationFrame(() => {
    layoutRefreshFrame = null;
    const state = getComparisonWindowState();
    syncComparisonLayoutGeometry(state);
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

function requestFrame(callback) {
  const raf = globalThis.requestAnimationFrame || globalThis.window?.requestAnimationFrame;
  if (typeof raf === 'function') return raf(callback);
  callback();
  return null;
}

function getPrimaryHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  const bar = findDisplayBarFast(primaryStore.getDisplayBars(), time, primaryStore.getCurrentTimeframe());
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function getComparisonHoverTimestamp(time) {
  if (time === undefined || time === null) return null;
  const state = getComparisonWindowState();
  const bars = getReplaySyncedBars(state.displayBars || [], state.descriptor.timeframe);
  const bar = findDisplayBarFast(bars, time, state.descriptor.timeframe);
  return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
}

function syncComparisonHoverCursor(primaryTime) {
  const state = getComparisonWindowState();
  if (!state.enabled || !state.displayBars?.length) {
    hideComparisonSyncCrosshairCursor();
    return;
  }
  const hoverTimestamp = getPrimaryHoverTimestamp(primaryTime);
  const syncedBars = getReplaySyncedBars(state.displayBars, state.descriptor.timeframe);
  const hoverTime = resolveExistingChartTimeFast(hoverTimestamp, state.descriptor.timeframe, syncedBars);
  if (hoverTime === null) {
    hideComparisonSyncCrosshairCursor();
    return;
  }
  showComparisonSyncCrosshairCursor(hoverTime);
}

function scheduleComparisonHoverCursor(primaryTime) {
  pendingPrimaryHoverTime = primaryTime;
  if (primaryHoverFrame !== null) return;
  primaryHoverFrame = requestFrame(() => {
    primaryHoverFrame = null;
    const time = pendingPrimaryHoverTime;
    pendingPrimaryHoverTime = null;
    syncComparisonHoverCursor(time);
  });
}

function syncPrimaryHoverCursor(comparisonTime) {
  const state = getComparisonWindowState();
  if (!state.enabled || !primaryStore.getDisplayBars().length) {
    chart.hideSyncCrosshairCursor();
    return;
  }
  const hoverTimestamp = getComparisonHoverTimestamp(comparisonTime);
  const hoverTime = resolveExistingChartTimeFast(
    hoverTimestamp,
    primaryStore.getCurrentTimeframe(),
    primaryStore.getDisplayBars()
  );
  if (hoverTime === null) {
    chart.hideSyncCrosshairCursor();
    return;
  }
  chart.showSyncCrosshairCursor(hoverTime);
}

function schedulePrimaryHoverCursor(comparisonTime) {
  pendingComparisonHoverTime = comparisonTime;
  if (comparisonHoverFrame !== null) return;
  comparisonHoverFrame = requestFrame(() => {
    comparisonHoverFrame = null;
    const time = pendingComparisonHoverTime;
    pendingComparisonHoverTime = null;
    syncPrimaryHoverCursor(time);
  });
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

function startDrag(event) {
  if (!root || !windowEl || event.button !== 0) return;
  if (getComparisonWindowState().descriptor.layoutMode === 'sliding') return;
  if (event.target.closest('button, select, input, textarea, label, .comparison-window-actions')) return;
  const bounds = root.getBoundingClientRect();
  const target = event.currentTarget;
  const current = getComparisonWindowState().descriptor.visibleWindow;
  dragState = {
    mode: 'move',
    pointerId: event.pointerId,
    target,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWindow: current,
    bounds,
  };
  root.classList.add('comparison-window-dragging');
  target.setPointerCapture?.(event.pointerId);
  target.addEventListener('pointermove', dragWindow);
  target.addEventListener('pointerup', stopDrag, { once: true });
  target.addEventListener('pointercancel', stopDrag, { once: true });
  event.stopPropagation();
  event.preventDefault();
}

function startSlideResize(event) {
  if (!root || !windowEl || event.button !== 0) return;
  const bounds = root.getBoundingClientRect();
  const target = event.currentTarget;
  const current = getComparisonWindowState().descriptor.visibleWindow;
  dragState = {
    mode: 'slide-left',
    pointerId: event.pointerId,
    target,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWindow: current,
    bounds,
  };
  root.classList.add('comparison-window-dragging');
  target.setPointerCapture?.(event.pointerId);
  target.addEventListener('pointermove', dragWindow);
  target.addEventListener('pointerup', stopDrag, { once: true });
  target.addEventListener('pointercancel', stopDrag, { once: true });
  event.stopPropagation();
  event.preventDefault();
}

function suppressComparisonDragEvent(event) {
  event.stopPropagation();
  event.preventDefault();
}

function dragWindow(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const dx = ((event.clientX - dragState.startClientX) / Math.max(1, dragState.bounds.width)) * 100;
  if (dragState.mode === 'slide-left') {
    const minWidth = 18;
    const nextWidth = Math.max(minWidth, Math.min(96, dragState.startWindow.width + dx));
    updateComparisonVisibleWindow({
      x: 0,
      y: 0,
      width: nextWidth,
      height: 100,
    });
  } else {
    const dy = ((event.clientY - dragState.startClientY) / Math.max(1, dragState.bounds.height)) * 100;
    updateComparisonVisibleWindow({
      x: dragState.startWindow.x + dx,
      y: dragState.startWindow.y + dy,
    });
  }
  event.stopPropagation();
  event.preventDefault();
}

function stopDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  dragState.target.removeEventListener('pointermove', dragWindow);
  dragState.target.releasePointerCapture?.(dragState.pointerId);
  root?.classList.remove('comparison-window-dragging');
  dragState = null;
  event.stopPropagation();
  event.preventDefault();
}
