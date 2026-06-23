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

function ensurePaneSyncButton(container, paneId) {
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
    container.appendChild(button);
  }
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
  ensurePaneSyncButton(primaryPane, CHART_PANE_IDS.PRIMARY);
  ensurePaneSyncButton(comparisonPane, CHART_PANE_IDS.COMPARISON);
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
