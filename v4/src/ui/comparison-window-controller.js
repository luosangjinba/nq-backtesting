import * as bus from '../event-bus.js';
import {
  getComparisonWindowState,
  resetComparisonVisibleWindow,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} from '../comparison/comparison-window-store.js';

let root = null;
let windowEl = null;
let dragState = null;

export function initComparisonWindowController() {
  ensureDom();
  render(getComparisonWindowState());
  bus.on('comparison-window:changed', render);
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
          <button class="comparison-window-btn" type="button" data-comparison-reset title="Reset window position">Reset</button>
          <button class="comparison-window-btn comparison-window-close" type="button" data-comparison-close title="Close Comparison Window">Close</button>
        </div>
      </header>
      <div class="comparison-window-rail" data-comparison-drag-handle aria-hidden="true">
        <div class="comparison-window-rail-handle"></div>
      </div>
      <div class="comparison-window-stage" id="comparison-chart-view" data-view-id="comparison-window-1">
        <div class="comparison-window-placeholder">
          <div class="comparison-window-placeholder-title">Comparison chart view</div>
          <div class="comparison-window-placeholder-meta">View contract ready · data loading and annotations remain disabled</div>
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
