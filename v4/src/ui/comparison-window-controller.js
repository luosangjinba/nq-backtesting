import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import {
  INSTRUMENT_OPTIONS,
  TIMEFRAME_MAP,
} from '../config.js';
import { formatTickPrice } from '../price-utils.js';
import {
  clearComparisonData,
  getComparisonChart,
  getComparisonPriceRange,
  getComparisonSeries,
  hideComparisonCursor,
  hideComparisonSyncCrosshairCursor,
  initComparisonChart,
  onComparisonCrosshairMove,
  resetComparisonPriceScale,
  setComparisonChartInfo,
  setComparisonData,
  showComparisonCursor,
  showComparisonEndOfData,
  showComparisonSyncCrosshairCursor,
  showComparisonStartOfData,
  zoomComparisonPriceScale,
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

let root = null;
let windowEl = null;
let comparisonBoundaryPriceAxisEl = null;
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
let priceAxisDragState = null;
let layoutResizeObserver = null;
let layoutRefreshFrame = null;

function shouldLoadReplaySource(start, end, timeframe) {
  if (Number(timeframe) <= 1) return false;
  return validateSingleWindowRange(start, end, 1).ok;
}

function renderInstrumentOptions(selectedInstrument) {
  return INSTRUMENT_OPTIONS.map(
    (instrument) =>
      `<option value="${instrument}"${instrument === selectedInstrument ? ' selected' : ''}>${instrument}</option>`
  ).join('');
}

function renderTimeframeOptions(selectedTimeframe) {
  return Object.entries(TIMEFRAME_MAP)
    .map(
      ([value, label]) =>
        `<option value="${value}"${Number(value) === Number(selectedTimeframe) ? ' selected' : ''}>${label}</option>`
    )
    .join('');
}

function renderOverlaySyncOptions(selectedMode) {
  return [
    ['sync', 'Sync'],
    ['no-sync', 'No Sync'],
  ].map(
    ([value, label]) =>
      `<option value="${value}"${value === selectedMode ? ' selected' : ''}>${label}</option>`
  ).join('');
}

export function initComparisonWindowController() {
  ensureDom();
  render(getComparisonWindowState());
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
  root.innerHTML = `
    <section id="comparison-window" class="comparison-window" aria-label="Comparison Window">
      <header class="comparison-window-header" data-comparison-drag-handle>
        <div class="comparison-window-title-block">
          <div class="comparison-window-title">Comparison Window</div>
          <div class="comparison-window-subtitle">Comparison workspace</div>
        </div>
        <div class="comparison-window-actions">
          <label class="comparison-window-field">
            <span>Inst</span>
            <select class="comparison-window-select" data-comparison-instrument></select>
          </label>
          <label class="comparison-window-field">
            <span>TF</span>
            <select class="comparison-window-select" data-comparison-timeframe></select>
          </label>
          <label class="comparison-window-field">
            <span>Drawings</span>
            <select class="comparison-window-select" data-comparison-overlay-sync></select>
          </label>
          <button class="comparison-window-btn" type="button" data-comparison-reset title="Reset window position">Reset</button>
          <button class="comparison-window-btn comparison-window-close" type="button" data-comparison-close title="Close Comparison Window">Close</button>
        </div>
      </header>
      <div class="comparison-window-left-handle" data-comparison-left-handle aria-label="Resize comparison window"></div>
      <div class="comparison-window-rail" data-comparison-drag-handle aria-hidden="true">
        <div class="comparison-window-rail-handle"></div>
      </div>
      <div class="comparison-window-stage" id="comparison-chart-view" data-view-id="comparison-window-1">
        <div id="comparison-chart-canvas" class="comparison-chart-canvas">
          <div id="comparison-chart-info" class="comparison-chart-info"></div>
          <div id="comparison-ohlc-legend" class="comparison-ohlc-legend"></div>
          <div class="comparison-overlay-status" data-comparison-overlay-status>Overlays waiting for comparison data</div>
          <div id="comparison-context-menu" class="pda-menu comparison-context-menu" hidden></div>
          <div class="comparison-window-placeholder" data-comparison-placeholder>
            <div class="comparison-window-placeholder-title">Comparison chart view</div>
            <div class="comparison-window-placeholder-meta" data-comparison-status>Choose a main date range to load comparison data</div>
          </div>
        </div>
      </div>
    </section>
    <div class="comparison-boundary-price-axis" data-comparison-boundary-price-axis aria-hidden="true"></div>
  `;
  host.appendChild(root);
  windowEl = root.querySelector('#comparison-window');
  comparisonBoundaryPriceAxisEl = root.querySelector('[data-comparison-boundary-price-axis]');
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
  comparisonBoundaryPriceAxisEl?.addEventListener('pointerdown', startComparisonPriceAxisScale);
  comparisonBoundaryPriceAxisEl?.addEventListener('wheel', handleComparisonPriceAxisWheel, { passive: false });
  comparisonBoundaryPriceAxisEl?.addEventListener('dblclick', resetComparisonPriceAxisScale);
}

function render(state) {
  ensureDom();
  if (!root || !windowEl) return;
  syncComparisonLayoutGeometry(state);
  if (!state.enabled) {
    renderComparisonBoundaryPriceAxis(state);
    return;
  }
  const { instrument, timeframe, syncMode, overlaySyncMode } = state.descriptor;
  windowEl.dataset.instrument = instrument;
  windowEl.dataset.timeframe = String(timeframe);
  windowEl.dataset.syncMode = syncMode;
  windowEl.dataset.overlaySyncMode = overlaySyncMode;
  const instrumentSelect = root.querySelector('[data-comparison-instrument]');
  const timeframeSelect = root.querySelector('[data-comparison-timeframe]');
  const overlaySyncSelect = root.querySelector('[data-comparison-overlay-sync]');
  if (instrumentSelect) {
    instrumentSelect.innerHTML = renderInstrumentOptions(instrument);
    instrumentSelect.value = instrument;
  }
  if (timeframeSelect) {
    timeframeSelect.innerHTML = renderTimeframeOptions(timeframe);
    timeframeSelect.value = String(timeframe);
  }
  if (overlaySyncSelect) {
    overlaySyncSelect.innerHTML = renderOverlaySyncOptions(overlaySyncMode);
    overlaySyncSelect.value = overlaySyncMode;
  }
  renderComparisonBoundaryPriceAxis(state);
  requestAnimationFrame(() => {
    initComparisonChart();
    setComparisonChartInfo({ instrument, timeframe });
    renderComparisonBoundaryPriceAxis(getComparisonWindowState());
  });
}

function syncComparisonLayoutGeometry(state = getComparisonWindowState()) {
  if (!root || !windowEl) return;
  const host = document.getElementById('chart-stack');
  root.hidden = !state.enabled;
  if (!state.enabled) {
    host?.style.setProperty('--primary-legend-left-offset', '0px');
    return;
  }
  const { visibleWindow, layoutMode } = state.descriptor;
  const isSliding = layoutMode === 'sliding';
  const rootRect = root.getBoundingClientRect();
  root.style.setProperty('--comparison-root-width', `${Math.max(1, Math.round(rootRect.width))}px`);
  const boundaryPx = isSliding
    ? ((Number(visibleWindow.x) + Number(visibleWindow.width)) / 100) * rootRect.width
    : 0;
  host?.style.setProperty('--primary-legend-left-offset', `${Math.max(0, Math.round(boundaryPx))}px`);
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
    renderComparisonBoundaryPriceAxis(state);
  });
}

function renderComparisonBoundaryPriceAxis(state = getComparisonWindowState()) {
  if (!root || !comparisonBoundaryPriceAxisEl) return;
  const descriptor = state?.descriptor || {};
  const visibleWindow = descriptor.visibleWindow || {};
  const isVisible = Boolean(state?.enabled) && descriptor.layoutMode === 'sliding';
  comparisonBoundaryPriceAxisEl.hidden = !isVisible;
  if (!isVisible) {
    comparisonBoundaryPriceAxisEl.innerHTML = '';
    return;
  }

  const rootRect = root.getBoundingClientRect();
  const canvasEl = document.getElementById('comparison-chart-canvas');
  const canvasRect = canvasEl?.getBoundingClientRect();
  const axisWidth = 70;
  const boundaryPx = ((Number(visibleWindow.x) + Number(visibleWindow.width)) / 100) * rootRect.width;
  comparisonBoundaryPriceAxisEl.style.left = `${Math.max(0, Math.round(boundaryPx - axisWidth))}px`;
  comparisonBoundaryPriceAxisEl.style.top = `${Math.max(0, Math.round((canvasRect?.top || rootRect.top) - rootRect.top))}px`;
  comparisonBoundaryPriceAxisEl.style.height = `${Math.max(1, Math.round(canvasRect?.height || rootRect.height))}px`;
  comparisonBoundaryPriceAxisEl.style.width = `${axisWidth}px`;

  const height = canvasRect?.height || rootRect.height;
  const comparisonSeries = getComparisonSeries();
  if (!height || !comparisonSeries) {
    comparisonBoundaryPriceAxisEl.innerHTML = '';
    return;
  }

  const currentRange = getComparisonPriceRange();
  const lowPrice = Number(currentRange?.minValue);
  const highPrice = Number(currentRange?.maxValue);
  const hasDataRange =
    Number.isFinite(lowPrice) &&
    Number.isFinite(highPrice) &&
    highPrice > lowPrice;
  const rangePadding = hasDataRange ? Math.max((highPrice - lowPrice) * 0.75, 100) : 0;
  const isPlausiblePrice = (price) => {
    if (!Number.isFinite(Number(price))) return false;
    if (!hasDataRange) return true;
    return price >= lowPrice - rangePadding && price <= highPrice + rangePadding;
  };
  const fallbackPriceAtY = (y) => {
    if (!hasDataRange) return null;
    const ratio = Math.max(0, Math.min(1, y / Math.max(1, height)));
    return highPrice - ratio * (highPrice - lowPrice);
  };

  const ticks = [];
  const step = Math.max(36, Math.round(height / 9));
  for (let y = 28; y <= height - 20; y += step) {
    const seriesPrice = Number(comparisonSeries.coordinateToPrice?.(y));
    const price = isPlausiblePrice(seriesPrice) ? seriesPrice : fallbackPriceAtY(y);
    if (!Number.isFinite(Number(price))) continue;
    ticks.push({ y, price: Number(price) });
  }

  comparisonBoundaryPriceAxisEl.innerHTML = ticks
    .map(
      ({ y, price }) =>
        `<span class="comparison-boundary-price-axis-label" style="top:${Math.round(y)}px">${formatTickPrice(price, descriptor.instrument)}</span>`
    )
    .join('');
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

function getComparisonPriceAxisAnchorRatio(event) {
  const rect = comparisonBoundaryPriceAxisEl?.getBoundingClientRect();
  if (!rect || rect.height <= 0) return 0.5;
  return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
}

function refreshComparisonBoundaryPriceAxis() {
  renderComparisonBoundaryPriceAxis(getComparisonWindowState());
}

function startComparisonPriceAxisScale(event) {
  if (!comparisonBoundaryPriceAxisEl || event.button !== 0) return;
  priceAxisDragState = {
    pointerId: event.pointerId,
    lastClientY: event.clientY,
    anchorRatio: getComparisonPriceAxisAnchorRatio(event),
  };
  comparisonBoundaryPriceAxisEl.setPointerCapture?.(event.pointerId);
  comparisonBoundaryPriceAxisEl.addEventListener('pointermove', dragComparisonPriceAxisScale);
  comparisonBoundaryPriceAxisEl.addEventListener('pointerup', stopComparisonPriceAxisScale, { once: true });
  comparisonBoundaryPriceAxisEl.addEventListener('pointercancel', stopComparisonPriceAxisScale, { once: true });
  root?.classList.add('comparison-price-axis-scaling');
  event.stopPropagation();
  event.preventDefault();
}

function dragComparisonPriceAxisScale(event) {
  if (!priceAxisDragState || event.pointerId !== priceAxisDragState.pointerId) return;
  const deltaY = event.clientY - priceAxisDragState.lastClientY;
  priceAxisDragState.lastClientY = event.clientY;
  if (Math.abs(deltaY) > 0) {
    zoomComparisonPriceScale(deltaY, priceAxisDragState.anchorRatio);
    refreshComparisonBoundaryPriceAxis();
  }
  event.stopPropagation();
  event.preventDefault();
}

function stopComparisonPriceAxisScale(event) {
  if (!priceAxisDragState || event.pointerId !== priceAxisDragState.pointerId) return;
  comparisonBoundaryPriceAxisEl?.removeEventListener('pointermove', dragComparisonPriceAxisScale);
  comparisonBoundaryPriceAxisEl?.releasePointerCapture?.(priceAxisDragState.pointerId);
  root?.classList.remove('comparison-price-axis-scaling');
  priceAxisDragState = null;
  refreshComparisonBoundaryPriceAxis();
  event.stopPropagation();
  event.preventDefault();
}

function handleComparisonPriceAxisWheel(event) {
  zoomComparisonPriceScale(event.deltaY, getComparisonPriceAxisAnchorRatio(event));
  refreshComparisonBoundaryPriceAxis();
  event.stopPropagation();
  event.preventDefault();
}

function resetComparisonPriceAxisScale(event) {
  resetComparisonPriceScale();
  refreshComparisonBoundaryPriceAxis();
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
