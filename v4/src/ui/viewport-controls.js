// Floating chart viewport controls.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as viewport from '../chart/viewport-controller.js';
import * as comparisonViewport from '../chart/comparison-viewport-controller.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { resolveAdjacentWindow } from '../data/load-range-policy.js';

let controlsEl = null;
let comparisonControlsEl = null;
let comparisonControlsBound = false;

const PRIMARY_ACTIONS = {
  prevWindow: () => loadAdjacentWindow('prev'),
  nextWindow: () => loadAdjacentWindow('next'),
  zoomOut: viewport.zoomOut,
  zoomIn: viewport.zoomIn,
  scrollLeft: viewport.scrollLeft,
  scrollRight: viewport.scrollRight,
  reset: viewport.resetChartView,
};

const COMPARISON_ACTIONS = {
  zoomOut: comparisonViewport.zoomOut,
  zoomIn: comparisonViewport.zoomIn,
  scrollLeft: comparisonViewport.scrollLeft,
  scrollRight: comparisonViewport.scrollRight,
  reset: comparisonViewport.resetChartView,
};

function setToolbarRange(start, end) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
}

function getWindowControlState(direction) {
  const outerRange = store.getRequestedOuterRange();
  if (!outerRange || Number(store.getCurrentTimeframe()) !== 1) return { visible: false, enabled: false };
  const currentRange = store.getCurrentRange();
  const resolved = resolveAdjacentWindow(outerRange, currentRange.start, currentRange.end, direction);
  return { visible: true, enabled: resolved.ok };
}

async function loadAdjacentWindow(direction) {
  const outerRange = store.getRequestedOuterRange();
  const currentRange = store.getCurrentRange();
  const resolved = resolveAdjacentWindow(outerRange, currentRange.start, currentRange.end, direction);
  if (!resolved.ok) {
    bus.emit('status:update', { text: resolved.message, isError: true });
    return;
  }

  bus.emit('status:update', { text: '加载中...', isError: false });
  try {
    const tf = Number(resolved.outerRange?.timeframe || store.getCurrentTimeframe());
    const result = await fetchBars(resolved.start, resolved.end, tf, getPrimaryInstrument());
    setToolbarRange(resolved.start, resolved.end);
    store.setBars(result.bars, resolved.start, resolved.end, tf, result.requestedRange, {
      outerRange: resolved.outerRange,
    });
    bus.emit('status:update', { text: resolved.message, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `窗口加载失败: ${err.message}`, isError: true });
  }
}

function renderControls(targetEl, canControl, resetTitle, options = {}) {
  if (!targetEl) return;
  const disabled = canControl() ? '' : 'disabled';
  const windowControls = options.showWindowControls
    ? ['prev', 'next'].map((direction) => {
        const state = getWindowControlState(direction);
        if (!state.visible) return '';
        const label = direction === 'prev' ? '‹‹' : '››';
        const title = direction === 'prev' ? 'Load previous 1m window' : 'Load next 1m window';
        const action = direction === 'prev' ? 'prevWindow' : 'nextWindow';
        return `<button class="viewport-btn viewport-window" data-action="${action}" title="${title}" ${state.enabled ? '' : 'disabled'}>${label}</button>`;
      }).join('')
    : '';
  targetEl.innerHTML = `
    <div class="viewport-main">
      ${windowControls}
      <button class="viewport-btn" data-action="zoomOut" title="Zoom out" ${disabled}>−</button>
      <button class="viewport-btn" data-action="zoomIn" title="Zoom in" ${disabled}>+</button>
      <button class="viewport-btn viewport-reset" data-action="reset" title="${resetTitle}" ${disabled}>↺</button>
      <button class="viewport-btn" data-action="scrollLeft" title="Scroll left" ${disabled}>‹</button>
      <button class="viewport-btn" data-action="scrollRight" title="Scroll right" ${disabled}>›</button>
    </div>
  `;
}

function renderPrimary() {
  renderControls(controlsEl, viewport.canControlViewport, 'Reset chart view (Alt + R)', { showWindowControls: true });
}

function renderComparison() {
  ensureComparisonControls();
  renderControls(
    comparisonControlsEl,
    comparisonViewport.canControlComparisonViewport,
    'Reset comparison chart view'
  );
}

function render() {
  renderPrimary();
  renderComparison();
}

function handleClick(actions, e) {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action || !actions[action]) return;

  actions[action]();
}

function handleKeydown(e) {
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
    return;
  }

  if (e.altKey && e.key.toLowerCase() === 'r') {
    e.preventDefault();
    viewport.resetChartView();
  }
}

function ensureComparisonControls() {
  const nextEl = document.getElementById('comparison-viewport-controls');
  if (!nextEl) return;
  if (comparisonControlsEl === nextEl && comparisonControlsBound) return;
  comparisonControlsEl = nextEl;
  comparisonControlsEl.addEventListener('click', (e) => handleClick(COMPARISON_ACTIONS, e));
  comparisonControlsBound = true;
}

export function initViewportControls() {
  controlsEl = document.getElementById('viewport-controls');

  controlsEl?.addEventListener('click', (e) => handleClick(PRIMARY_ACTIONS, e));
  ensureComparisonControls();
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', render);
  bus.on('bars:cleared', render);
  bus.on('comparison-bars:loaded', render);
  bus.on('comparison-bars:cleared', render);
  bus.on('comparison-window:changed', () => {
    ensureComparisonControls();
    render();
  });
  render();
}
