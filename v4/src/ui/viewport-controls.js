// Floating chart viewport controls.

import * as bus from '../event-bus.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';

let controlsEl = null;
let secondaryControlsEl = null;

const PRIMARY_ACTIONS = {
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

function renderControls(targetEl, canControl, resetTitle) {
  if (!targetEl) return;
  const disabled = canControl() ? '' : 'disabled';
  targetEl.innerHTML = `
    <div class="viewport-main">
      <button class="viewport-btn" data-action="zoomOut" title="Zoom out" ${disabled}>−</button>
      <button class="viewport-btn" data-action="zoomIn" title="Zoom in" ${disabled}>+</button>
      <button class="viewport-btn viewport-reset" data-action="reset" title="${resetTitle}" ${disabled}>↺</button>
      <button class="viewport-btn" data-action="scrollLeft" title="Scroll left" ${disabled}>‹</button>
      <button class="viewport-btn" data-action="scrollRight" title="Scroll right" ${disabled}>›</button>
    </div>
  `;
}

function renderPrimary() {
  renderControls(controlsEl, viewport.canControlViewport, 'Reset chart view (Alt + R)');
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
