// Floating chart viewport controls.

import * as bus from '../event-bus.js';
import * as viewport from '../chart/viewport-controller.js';

let controlsEl = null;

const ACTIONS = {
  zoomOut: viewport.zoomOut,
  zoomIn: viewport.zoomIn,
  scrollLeft: viewport.scrollLeft,
  scrollRight: viewport.scrollRight,
  latest: viewport.scrollToLatest,
  reset: viewport.resetChartView,
};

function render() {
  if (!controlsEl) return;

  const disabled = viewport.canControlViewport() ? '' : 'disabled';
  controlsEl.innerHTML = `
    <div class="viewport-main">
      <button class="viewport-btn" data-action="zoomOut" title="Zoom out" ${disabled}>−</button>
      <button class="viewport-btn" data-action="zoomIn" title="Zoom in" ${disabled}>+</button>
      <button class="viewport-btn viewport-reset" data-action="reset" title="Reset chart view (Alt + R)" ${disabled}>↺</button>
      <button class="viewport-btn" data-action="scrollLeft" title="Scroll left" ${disabled}>‹</button>
      <button class="viewport-btn" data-action="scrollRight" title="Scroll right" ${disabled}>›</button>
      <button class="viewport-btn" data-action="latest" title="Scroll to latest" ${disabled}>⇥</button>
    </div>
  `;
}

function handleClick(e) {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action || !ACTIONS[action]) return;

  ACTIONS[action]();
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
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', render);
  bus.on('bars:cleared', render);
  render();
}
