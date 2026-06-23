import * as bus from '../event-bus.js';
import {
  CHART_PANE_IDS,
  getPaneById,
  getActivePaneId,
  setActivePane,
  togglePaneSync,
} from './chart-pane-store.js';

const DEFAULT_PRIMARY_WIDTH_PERCENT = 50;
const MIN_PRIMARY_WIDTH_PERCENT = 20;
const MAX_PRIMARY_WIDTH_PERCENT = 80;

function clampPaneWidthPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_PRIMARY_WIDTH_PERCENT;
  return Math.max(MIN_PRIMARY_WIDTH_PERCENT, Math.min(MAX_PRIMARY_WIDTH_PERCENT, number));
}

function syncButtonText(paneId) {
  return getPaneById(paneId)?.syncEnabled ? 'Sync' : 'No Sync';
}

function formatPaneTimeframe(timeframe) {
  const value = Number(timeframe);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value === 1440) return '1D';
  if (value % 60 === 0) return `${value / 60}H`;
  return `${value}M`;
}

function ensurePaneBadge(container, paneId) {
  if (!container) return null;
  let badge = container.querySelector(`[data-pane-badge="${paneId}"]`);
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'chart-pane-badge';
    badge.dataset.paneBadge = paneId;
    const label = document.createElement('span');
    label.className = 'chart-pane-badge-label';
    label.dataset.paneBadgeLabel = paneId;
    badge.appendChild(label);
    container.appendChild(badge);
  }
  const pane = getPaneById(paneId);
  const label = badge.querySelector(`[data-pane-badge-label="${paneId}"]`);
  if (pane && label) {
    label.textContent = `${pane.instrument} ${formatPaneTimeframe(pane.timeframe)}`;
  }
  return badge;
}

function ensurePaneSyncButton(container, paneId, badge = null) {
  if (!container) return;
  let button = container.querySelector(`[data-pane-sync-toggle="${paneId}"]`);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'chart-pane-sync-toggle';
    button.dataset.paneSyncToggle = paneId;
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      setActivePane(paneId);
      togglePaneSync(paneId);
    });
  }
  (badge || container).appendChild(button);
  button.textContent = syncButtonText(paneId);
  button.classList.toggle('chart-pane-sync-toggle-off', syncButtonText(paneId) === 'No Sync');
}

function setPrimaryPaneWidthPercent(percent) {
  const stack = document.getElementById('chart-stack');
  stack?.style.setProperty('--primary-pane-width', `${clampPaneWidthPercent(percent).toFixed(2)}%`);
}

function resetPrimaryPaneWidth() {
  setPrimaryPaneWidthPercent(DEFAULT_PRIMARY_WIDTH_PERCENT);
}

function ensurePaneDivider() {
  const stack = document.getElementById('chart-stack');
  const comparisonPane = document.getElementById('comparison-window-root');
  if (!stack) return null;
  let divider = stack.querySelector('[data-chart-pane-divider]');
  if (!divider) {
    divider = document.createElement('div');
    divider.className = 'chart-pane-divider';
    divider.dataset.chartPaneDivider = 'true';
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.title = 'Drag to resize panes. Double-click to reset.';
    divider.addEventListener('pointerdown', startPaneDividerDrag);
    divider.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      event.preventDefault();
      resetPrimaryPaneWidth();
    });
  }
  if (comparisonPane && divider.nextElementSibling !== comparisonPane) {
    stack.insertBefore(divider, comparisonPane);
  } else if (!divider.parentElement) {
    stack.appendChild(divider);
  }
  return divider;
}

function startPaneDividerDrag(event) {
  if (event.button !== 0) return;
  const stack = document.getElementById('chart-stack');
  const divider = event.currentTarget;
  const bounds = stack?.getBoundingClientRect();
  if (!stack || !bounds?.width) return;

  function moveDivider(moveEvent) {
    if (moveEvent.pointerId !== event.pointerId) return;
    const nextPercent = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
    setPrimaryPaneWidthPercent(nextPercent);
    moveEvent.stopPropagation();
    moveEvent.preventDefault();
  }

  function stopDividerDrag(stopEvent) {
    if (stopEvent.pointerId !== event.pointerId) return;
    divider.removeEventListener('pointermove', moveDivider);
    try {
      divider.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore non-captured synthetic pointer events.
    }
    stack.classList.remove('chart-pane-divider-dragging');
    stopEvent.stopPropagation();
    stopEvent.preventDefault();
  }

  stack.classList.add('chart-pane-divider-dragging');
  try {
    divider.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic browser-smoke pointer events may not be capture-eligible.
  }
  divider.addEventListener('pointermove', moveDivider);
  divider.addEventListener('pointerup', stopDividerDrag, { once: true });
  divider.addEventListener('pointercancel', stopDividerDrag, { once: true });
  event.stopPropagation();
  event.preventDefault();
}

function markActivePane() {
  const activePaneId = getActivePaneId();
  const primaryPane = document.getElementById('primary-chart-panel');
  const comparisonPane = document.getElementById('comparison-window-root');
  const divider = ensurePaneDivider();
  primaryPane?.classList.toggle(
    'chart-pane-active',
    activePaneId === CHART_PANE_IDS.PRIMARY
  );
  comparisonPane?.classList.toggle(
    'chart-pane-active',
    activePaneId === CHART_PANE_IDS.COMPARISON
  );
  const primaryBadge = ensurePaneBadge(primaryPane, CHART_PANE_IDS.PRIMARY);
  const comparisonBadge = ensurePaneBadge(comparisonPane, CHART_PANE_IDS.COMPARISON);
  ensurePaneSyncButton(primaryPane, CHART_PANE_IDS.PRIMARY, primaryBadge);
  ensurePaneSyncButton(comparisonPane, CHART_PANE_IDS.COMPARISON, comparisonBadge);
  divider?.toggleAttribute('hidden', !comparisonPane || comparisonPane.hidden);
}

function bindPaneFocus(selector, paneId) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.addEventListener('pointerdown', () => setActivePane(paneId), true);
  element.addEventListener('contextmenu', () => setActivePane(paneId), true);
  element.addEventListener('focusin', () => setActivePane(paneId), true);
}

export function initChartPaneDom() {
  bindPaneFocus('#primary-chart-panel', CHART_PANE_IDS.PRIMARY);
  bindPaneFocus('#comparison-window-root', CHART_PANE_IDS.COMPARISON);
  bus.on('comparison-window:dom-ready', () => {
    bindPaneFocus('#comparison-window-root', CHART_PANE_IDS.COMPARISON);
    markActivePane();
  });
  bus.on('comparison-window:changed', () => requestAnimationFrame(markActivePane));
  bus.on('chart-panes:changed', markActivePane);
  markActivePane();
}
