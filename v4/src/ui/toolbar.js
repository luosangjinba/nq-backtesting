// Toolbar UI: date range, chart settings, display filters, and status text.

import * as bus from '../event-bus.js';
import * as chartManager from '../chart/chart-manager.js';
import { setGridVisible } from '../chart/grid-visibility.js';
import {
  CHART_PANE_IDS,
  getActivePane,
  updatePaneDescriptor,
} from '../chart-panes/chart-pane-store.js';
import { formatTimeInput } from '../utils.js';
import { getDisplayMode, updateDisplayMode } from '../display/display-mode.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { canRedo, canUndo, getRedoLabel, getUndoLabel, redo, undo } from '../history/history-manager.js';
import { initCalendarNavigator } from './calendar-navigator.js';
import { getToolbarRenderState } from './toolbar/toolbar-state.js';
import { renderToolbarShell } from './toolbar/toolbar-view.js';
import { handleToolbarRangeLoad } from './toolbar/toolbar-range-controller.js';
import {
  applyActivePaneInstrument,
  applyActivePaneTimeframe,
  syncActivePaneToolbarControls,
  syncPaneStateFromComparison,
} from './toolbar/toolbar-pane-controller.js';
import {
  initToolbarLayoutController,
  syncLayoutControls,
} from './toolbar/toolbar-layout-controller.js';
import { initToolbarSettingsController } from './toolbar/toolbar-settings-controller.js';

export function initToolbar() {
  const container = document.getElementById('toolbar');
  syncPaneStateFromComparison();

  container.innerHTML = renderToolbarShell(getToolbarRenderState());

  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const primaryInstrumentSelect = document.getElementById('primaryInstrumentSelect');
  const tfSelect = document.getElementById('tfSelect');
  const dateRangeBtn = document.getElementById('dateRangeBtn');
  const archiveBtn = document.getElementById('archiveBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const dayBoundaryToggle = document.getElementById('dayBoundaryToggle');
  const chartGridToggle = document.getElementById('chartGridToggle');
  const displayModeSelect = document.getElementById('displayModeSelect');
  const displayRecentCountInput = document.getElementById('displayRecentCountInput');
  let layoutController = null;
  const settingsController = initToolbarSettingsController({
    closePeers: () => layoutController?.close(),
  });
  layoutController = initToolbarLayoutController({
    closePeers: () => settingsController.close(),
  });

  initCalendarNavigator(dateRangeBtn);
  archiveBtn.addEventListener('click', () => {
    bus.emit('inspector:open-archive');
  });
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  // Keep hidden range fields normalized for reloads triggered by the left pane TF.
  [startInput, endInput].forEach((input) => {
    input.addEventListener('blur', (e) => {
      const formatted = formatTimeInput(e.target.value);
      if (formatted !== e.target.value) {
        e.target.value = formatted;
      }
    });
  });

  primaryInstrumentSelect.addEventListener('change', () => {
    applyActivePaneInstrument(primaryInstrumentSelect.value, handleToolbarRangeLoad);
  });

  tfSelect.addEventListener('change', () => {
    applyActivePaneTimeframe(tfSelect.value, handleToolbarRangeLoad);
  });

  dayBoundaryToggle.addEventListener('change', (e) => {
    updateTimeOverlaySettings({ showDayBoundary: e.target.checked });
  });

  chartGridToggle.addEventListener('change', (e) => {
    setGridVisible(e.target.checked);
    chartManager.applyGridVisibility();
  });

  displayModeSelect.addEventListener('change', (e) => {
    updateDisplayMode({ mode: e.target.value });
  });
  displayRecentCountInput.addEventListener('change', (e) => {
    updateDisplayMode({ recentCount: e.target.value });
    e.target.value = getDisplayMode().recentCount;
  });

  // 监听状态更新
  bus.on('status:update', ({ text, isError }) => {
    const el = document.getElementById('statusText');
    if (el) {
      el.textContent = text;
      el.style.color = isError ? '#ef5350' : '#b2b5be';
    }
  });
  bus.on('history:changed', updateHistoryButtons);
  bus.on('comparison-window:changed', (state) => {
    syncLayoutControls();
    syncPaneStateFromComparison(state);
  });
  bus.on('primary-instrument:changed', ({ instrument }) => {
    updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { instrument });
    const select = document.getElementById('primaryInstrumentSelect');
    if (select && getActivePane().id === CHART_PANE_IDS.PRIMARY) select.value = instrument;
  });
  bus.on('chart-panes:changed', () => {
    syncActivePaneToolbarControls();
    syncLayoutControls();
  });
  document.addEventListener('click', () => {
    settingsController.close();
    layoutController.close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      settingsController.close();
      layoutController.close();
    }
  });
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) {
    undoBtn.disabled = !canUndo();
    undoBtn.title = getUndoLabel() ? `Undo: ${getUndoLabel()}` : 'Undo';
  }
  if (redoBtn) {
    redoBtn.disabled = !canRedo();
    redoBtn.title = getRedoLabel() ? `Redo: ${getRedoLabel()}` : 'Redo';
  }
}
