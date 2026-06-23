import * as bus from '../event-bus.js';
import {
  CHART_PANE_IDS,
  getPaneById,
  getActivePaneId,
  setActivePane,
  togglePaneSync,
} from './chart-pane-store.js';

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

function markActivePane() {
  const activePaneId = getActivePaneId();
  const primaryPane = document.getElementById('primary-chart-panel');
  const comparisonPane = document.getElementById('comparison-window-root');
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
  bus.on('chart-panes:changed', markActivePane);
  markActivePane();
}
