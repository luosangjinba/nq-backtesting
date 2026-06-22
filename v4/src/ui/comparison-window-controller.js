import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import {
  INSTRUMENT_OPTIONS,
  TIMEFRAME_MAP,
} from '../config.js';
import {
  clearComparisonData,
  initComparisonChart,
  setComparisonChartInfo,
  setComparisonData,
  showComparisonStartOfData,
} from '../chart/comparison-chart-manager.js';
import { getBarChartTime } from '../chart/time-projection.js';
import * as primaryStore from '../data/bar-store.js';
import {
  getComparisonWindowState,
  clearComparisonBars,
  resetComparisonVisibleWindow,
  setComparisonInstrument,
  setComparisonBars,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} from '../comparison/comparison-window-store.js';
import { updateComparisonOverlayStatus } from '../comparison/comparison-overlay-policy.js';

let root = null;
let windowEl = null;
let dragState = null;
let requestSeq = 0;
let lastLoadSignature = null;

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

export function initComparisonWindowController() {
  ensureDom();
  render(getComparisonWindowState());
  bus.on('comparison-window:changed', render);
  bus.on('comparison-window:changed', handleComparisonChanged);
  bus.on('bars:loaded', () => loadComparisonForPrimaryRange({ force: true }));
  bus.on('bars:cleared', clearComparisonView);
  window.addEventListener('resize', () => render(getComparisonWindowState()));
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
          <div class="comparison-window-subtitle">Read-only MVP shell</div>
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
          <button class="comparison-window-btn" type="button" data-comparison-reset title="Reset window position">Reset</button>
          <button class="comparison-window-btn comparison-window-close" type="button" data-comparison-close title="Close Comparison Window">Close</button>
        </div>
      </header>
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
  `;
  host.appendChild(root);
  windowEl = root.querySelector('#comparison-window');
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
  root.querySelectorAll('[data-comparison-drag-handle]').forEach((handle) => {
    handle.addEventListener('pointerdown', startDrag);
    handle.addEventListener('dblclick', () => resetComparisonVisibleWindow());
  });
}

function render(state) {
  ensureDom();
  if (!root || !windowEl) return;
  root.hidden = !state.enabled;
  if (!state.enabled) return;
  const { visibleWindow, instrument, timeframe, syncMode } = state.descriptor;
  windowEl.style.left = `${visibleWindow.x}%`;
  windowEl.style.top = `${visibleWindow.y}%`;
  windowEl.style.width = `${visibleWindow.width}%`;
  windowEl.style.height = `${visibleWindow.height}%`;
  windowEl.dataset.instrument = instrument;
  windowEl.dataset.timeframe = String(timeframe);
  windowEl.dataset.syncMode = syncMode;
  const instrumentSelect = root.querySelector('[data-comparison-instrument]');
  const timeframeSelect = root.querySelector('[data-comparison-timeframe]');
  if (instrumentSelect) {
    instrumentSelect.innerHTML = renderInstrumentOptions(instrument);
    instrumentSelect.value = instrument;
  }
  if (timeframeSelect) {
    timeframeSelect.innerHTML = renderTimeframeOptions(timeframe);
    timeframeSelect.value = String(timeframe);
  }
  requestAnimationFrame(() => {
    initComparisonChart();
    setComparisonChartInfo({ instrument, timeframe });
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
    const result = await fetchBars(start, end, timeframe, instrument);
    if (seq !== requestSeq || !getComparisonWindowState().enabled) return;
    setComparisonBars(result.bars, result.requestedRange, { start, end });
    const displayBars = getDisplayBarsFromResult(result);
    const chartData = displayBars.map((bar) => toChartBar(bar, timeframe));
    setComparisonData(chartData);
    showComparisonStartOfData(chartData.length);
    if (chartData.length > 0) {
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
    clearComparisonData();
    setComparisonStatus(`Comparison load failed: ${error.message}`, true);
    updateComparisonOverlayStatus();
    bus.emit('status:update', {
      text: `Comparison 加载失败: ${error.message}`,
      isError: true,
    });
  }
}

function startDrag(event) {
  if (!root || !windowEl || event.button !== 0) return;
  if (event.target.closest('button')) return;
  const bounds = root.getBoundingClientRect();
  const target = event.currentTarget;
  const current = getComparisonWindowState().descriptor.visibleWindow;
  dragState = {
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

function dragWindow(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;
  const dx = ((event.clientX - dragState.startClientX) / Math.max(1, dragState.bounds.width)) * 100;
  const dy = ((event.clientY - dragState.startClientY) / Math.max(1, dragState.bounds.height)) * 100;
  updateComparisonVisibleWindow({
    x: dragState.startWindow.x + dx,
    y: dragState.startWindow.y + dy,
  });
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
}
