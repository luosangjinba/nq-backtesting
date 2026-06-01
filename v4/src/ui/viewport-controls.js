// Floating chart viewport controls.

import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';
import * as store from '../data/bar-store.js';
import { resolveAdjacentWindow } from '../data/load-range-policy.js';

let controlsEl = null;
let secondaryControlsEl = null;

const PRIMARY_ACTIONS = {
  prevWindow: () => loadAdjacentWindow('prev'),
  nextWindow: () => loadAdjacentWindow('next'),
  zoomOut: viewport.zoomOut,
  zoomIn: viewport.zoomIn,
  scrollLeft: viewport.scrollLeft,
  scrollRight: viewport.scrollRight,
  reset: viewport.resetChartView,
};

const SECONDARY_ACTIONS = {
  zoomOut: secondaryViewport.zoomOut,
  zoomIn: secondaryViewport.zoomIn,
  scrollLeft: secondaryViewport.scrollLeft,
  scrollRight: secondaryViewport.scrollRight,
  reset: secondaryViewport.resetChartView,
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
    const result = await fetchBars(resolved.start, resolved.end, tf);
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

function renderSecondary() {
  renderControls(secondaryControlsEl, secondaryViewport.canControlViewport, 'Reset secondary chart view');
}

function render() {
  renderPrimary();
  renderSecondary();
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

export function initViewportControls() {
  controlsEl = document.getElementById('viewport-controls');
  secondaryControlsEl = document.getElementById('secondary-viewport-controls');

  controlsEl?.addEventListener('click', (e) => handleClick(PRIMARY_ACTIONS, e));
  secondaryControlsEl?.addEventListener('click', (e) => handleClick(SECONDARY_ACTIONS, e));
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', render);
  bus.on('bars:cleared', render);
  bus.on('secondary-bars:loaded', renderSecondary);
  bus.on('secondary-bars:cleared', renderSecondary);
  bus.on('secondary-chart:settings-changed', renderSecondary);
  bus.on('secondary-chart:reset', renderSecondary);
  render();
}
