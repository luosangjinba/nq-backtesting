import * as bus from '../event-bus.js';
import {
  initComparisonChart,
  onComparisonCrosshairMove,
  setComparisonChartInfo,
} from '../chart/comparison-chart-manager.js';
import * as chart from '../chart/chart-manager.js';
import {
  getComparisonWindowState,
  resetComparisonVisibleWindow,
  setComparisonInstrument,
  setComparisonOverlaySyncMode,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} from '../comparison/comparison-window-store.js';
import {
  renderComparisonWindowTemplate,
  syncComparisonHeaderControls,
} from './comparison/comparison-window-view.js';
import {
  createComparisonWindowDragHandlers,
  syncComparisonLayoutGeometry,
} from './comparison/comparison-window-layout.js';
import { createComparisonCrosshairSync } from './comparison/comparison-crosshair-sync.js';
import { createComparisonWindowDataController } from './comparison/comparison-window-data.js';

let root = null;
let windowEl = null;
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
  getReplaySyncedBars: (...args) => dataController.getReplaySyncedBars(...args),
});
const dataController = createComparisonWindowDataController({
  setComparisonStatus,
  hideComparisonPlaceholder,
});

export function initComparisonWindowController() {
  ensureDom();
  render(getComparisonWindowState());
  bus.emit('comparison-window:dom-ready', getComparisonWindowState());
  bus.on('comparison-window:changed', render);
  bus.on('comparison-window:changed', dataController.handleComparisonChanged);
  bus.on('bars:loaded', () => dataController.loadComparisonForPrimaryRange({ force: true }));
  bus.on('bars:cleared', dataController.clearComparisonView);
  bus.on('replay:changed', dataController.handleReplayChanged);
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
