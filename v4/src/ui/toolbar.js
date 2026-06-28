// Toolbar UI: date range, chart settings, display filters, and status text.

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME, TIMEFRAME_MAP } from '../config.js';
import * as chartManager from '../chart/chart-manager.js';
import { setGridVisible } from '../chart/grid-visibility.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  loadPrimaryRangeCommand,
  setPrimaryInstrumentCommand,
  setPrimaryTimeframeCommand,
} from '../runtime/commands.js';
import {
  getComparisonWindowState,
  isComparisonWindowEnabled,
  setComparisonInstrument,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
} from '../comparison/comparison-window-store.js';
import {
  CHART_PANE_IDS,
  CHART_PANE_LAYOUTS,
  getActivePane,
  getChartPaneState,
  getPaneById,
  getPaneLabel,
  setActivePane,
  setChartPaneLayout,
  updatePaneDescriptor,
} from '../chart-panes/chart-pane-store.js';
import { resolveChartLoadRange } from '../data/load-range-policy.js';
import { formatTimeInput } from '../utils.js';
import { getDisplayMode, updateDisplayMode } from '../display/display-mode.js';
import { resetDisplayPreferences, setDisplayPreferences } from '../display/display-preferences.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { canRedo, canUndo, getRedoLabel, getUndoLabel, redo, undo } from '../history/history-manager.js';
import { initCalendarNavigator } from './calendar-navigator.js';
import { getToolbarRenderState, getToolbarSettingsState } from './toolbar/toolbar-state.js';
import { renderSettingsPopoverContent, renderToolbarShell } from './toolbar/toolbar-view.js';

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
  const toolbarSettingsBtn = document.getElementById('toolbarSettingsBtn');
  const toolbarSettingsPopover = document.getElementById('toolbarSettingsPopover');
  const chartLayoutBtn = document.getElementById('chartLayoutBtn');
  const chartLayoutPopover = document.getElementById('chartLayoutPopover');
  const dayBoundaryToggle = document.getElementById('dayBoundaryToggle');
  const chartGridToggle = document.getElementById('chartGridToggle');
  const displayModeSelect = document.getElementById('displayModeSelect');
  const displayRecentCountInput = document.getElementById('displayRecentCountInput');

  initCalendarNavigator(dateRangeBtn);
  archiveBtn.addEventListener('click', () => {
    bus.emit('inspector:open-archive');
  });
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  toolbarSettingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsPopover();
  });
  toolbarSettingsPopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  toolbarSettingsPopover.addEventListener('change', handleSettingsChange);
  toolbarSettingsPopover.addEventListener('click', handleSettingsClick);
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
    applyActivePaneInstrument(primaryInstrumentSelect.value);
  });

  tfSelect.addEventListener('change', () => {
    applyActivePaneTimeframe(tfSelect.value);
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

  chartLayoutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLayoutPopover();
  });
  chartLayoutPopover.addEventListener('click', (e) => {
    e.stopPropagation();
    handleLayoutClick(e);
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
  bus.on('display-preferences:changed', renderSettingsPopover);
  document.addEventListener('click', () => {
    closeSettingsPopover();
    closeLayoutPopover();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettingsPopover();
      closeLayoutPopover();
    }
  });
  updateHistoryButtons();
}

function applyChartLayout(layout) {
  if (layout === CHART_PANE_LAYOUTS.TWO_COLUMN) {
    setComparisonWindowEnabled(true);
    setChartPaneLayout(CHART_PANE_LAYOUTS.TWO_COLUMN);
    return;
  }
  setComparisonWindowEnabled(true);
  setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
  setActivePane(CHART_PANE_IDS.COMPARISON);
}

function handleLayoutClick(event) {
  const action = event.target.closest('[data-layout-action]')?.dataset.layoutAction;
  if (!action) return;
  applyChartLayout(action === 'two-column' ? CHART_PANE_LAYOUTS.TWO_COLUMN : CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
  closeLayoutPopover();
}

function syncLayoutControls() {
  const layout = getChartPaneState().layout;
  const chartLayoutBtn = document.getElementById('chartLayoutBtn');
  const chartLayoutPopover = document.getElementById('chartLayoutPopover');
  const isTwoColumn = isComparisonWindowEnabled() && layout === CHART_PANE_LAYOUTS.TWO_COLUMN;
  chartLayoutBtn
    ?.querySelector('.toolbar-layout-icon')
    ?.classList.toggle('toolbar-layout-icon-two-column', isTwoColumn);
  chartLayoutBtn
    ?.querySelector('.toolbar-layout-icon')
    ?.classList.toggle('toolbar-layout-icon-single-right', !isTwoColumn);
  chartLayoutPopover?.querySelectorAll('[data-layout-action]').forEach((button) => {
    button.classList.toggle('active', button.dataset.layoutAction === layout);
  });
}

function syncPaneStateFromComparison(state = getComparisonWindowState()) {
  const currentLayout = getChartPaneState().layout;
  if (state.enabled && currentLayout === CHART_PANE_LAYOUTS.SINGLE) {
    setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
  } else if (!state.enabled) {
    setComparisonWindowEnabled(true);
    setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
    return;
  }
  const descriptor = state.descriptor || {};
  updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, {
    instrument: descriptor.instrument,
    timeframe: descriptor.timeframe,
  });
}

function syncActivePaneToolbarControls() {
  const activePane = getActivePane();
  const primaryInstrumentSelect = document.getElementById('primaryInstrumentSelect');
  const tfSelect = document.getElementById('tfSelect');
  if (primaryInstrumentSelect) primaryInstrumentSelect.value = activePane.instrument;
  if (tfSelect) tfSelect.value = String(activePane.timeframe);
}

function renderSettingsPopover() {
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!popover) return;
  popover.innerHTML = renderSettingsPopoverContent(getToolbarSettingsState().preferences);
}

function positionSettingsPopover() {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 16);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))}px`;
  popover.style.top = `${rect.bottom + 8}px`;
}

function openSettingsPopover() {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!button || !popover) return;
  renderSettingsPopover();
  popover.hidden = false;
  button.classList.add('active');
  button.setAttribute('aria-expanded', 'true');
  positionSettingsPopover();
}

function closeSettingsPopover() {
  const button = document.getElementById('toolbarSettingsBtn');
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!button || !popover || popover.hidden) return;
  popover.hidden = true;
  button.classList.remove('active');
  button.setAttribute('aria-expanded', 'false');
}

function positionLayoutPopover() {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(108, window.innerWidth - 16);
  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, rect.left))}px`;
  popover.style.top = `${rect.bottom + 8}px`;
}

function openLayoutPopover() {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');
  if (!button || !popover) return;
  syncLayoutControls();
  popover.hidden = false;
  button.classList.add('active');
  button.setAttribute('aria-expanded', 'true');
  positionLayoutPopover();
}

function closeLayoutPopover() {
  const button = document.getElementById('chartLayoutBtn');
  const popover = document.getElementById('chartLayoutPopover');
  if (!button || !popover) return;
  popover.hidden = true;
  button.classList.remove('active');
  button.setAttribute('aria-expanded', 'false');
}

function toggleLayoutPopover() {
  const popover = document.getElementById('chartLayoutPopover');
  if (!popover) return;
  if (popover.hidden) {
    closeSettingsPopover();
    openLayoutPopover();
  } else {
    closeLayoutPopover();
  }
}

function toggleSettingsPopover() {
  const popover = document.getElementById('toolbarSettingsPopover');
  if (!popover || popover.hidden) {
    openSettingsPopover();
    return;
  }
  closeSettingsPopover();
}

function handleSettingsChange(e) {
  const action = e.target.dataset.displayAction;
  if (action === 'ui-scale') {
    setDisplayPreferences({ uiScale: e.target.value });
    bus.emit('status:update', { text: `UI scale ${e.target.value}%`, isError: false });
  } else if (action === 'chart-text-scale') {
    setDisplayPreferences({ chartTextScale: e.target.value });
    bus.emit('status:update', { text: `Chart text ${e.target.value}`, isError: false });
  } else if (action === 'inspector-density') {
    setDisplayPreferences({ inspectorDensity: e.target.value });
    bus.emit('status:update', { text: `Inspector density ${e.target.value}`, isError: false });
  }
}

function handleSettingsClick(e) {
  const actionEl = e.target.closest('[data-display-action]');
  if (actionEl?.dataset.displayAction !== 'reset-defaults') return;
  resetDisplayPreferences();
  bus.emit('status:update', { text: 'Display setup reset', isError: false });
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

async function handleLoad() {
  const startEl = document.getElementById('startInput');
  const endEl = document.getElementById('endInput');
  startEl.value = formatTimeInput(startEl.value.trim());
  endEl.value = formatTimeInput(endEl.value.trim());
  const start = startEl.value;
  const end = endEl.value;
  const primaryPane = getPaneById(CHART_PANE_IDS.PRIMARY);
  const tf = Number(primaryPane?.timeframe) || DEFAULT_TIMEFRAME;
  const instrument = getPrimaryInstrument();
  setPrimaryInstrumentCommand({ instrument });
  setPrimaryTimeframeCommand({ timeframe: tf });

  if (!start || !end) {
    bus.emit('status:update', { text: 'Choose a date range first', isError: true });
    return;
  }

  const loadRange = resolveChartLoadRange(start, end, tf);
  if (!loadRange.ok) {
    bus.emit('status:update', { text: loadRange.message, isError: true });
    return;
  }

  bus.emit('status:update', { text: 'Loading...', isError: false });

  try {
    const result = await loadPrimaryRangeCommand({
      start: loadRange.start,
      end: loadRange.end,
      timeframe: tf,
      instrument,
      outerRange: loadRange.outerRange,
    });
    if (loadRange.windowed) {
      startEl.value = loadRange.start;
      endEl.value = loadRange.end;
    }
    bus.emit('status:update', {
      text: loadRange.windowed ? loadRange.message : `Loaded ${result.bars.length} bars`,
      isError: false,
    });
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

function applyActivePaneInstrument(nextInstrument) {
  const activePane = getActivePane();
  if (activePane.id === CHART_PANE_IDS.COMPARISON) {
    const descriptor = updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { instrument: nextInstrument });
    setComparisonInstrument(descriptor.instrument);
    bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.COMPARISON)} ${descriptor.instrument}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  const instrument = setPrimaryInstrumentCommand({ instrument: nextInstrument });
  bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.PRIMARY)} ${instrument}`, isError: false });
  syncActivePaneToolbarControls();
  if (store.getBars().length > 0) {
    handleLoad();
  }
}

function applyActivePaneTimeframe(nextTimeframe) {
  const activePane = getActivePane();
  const timeframe = Number(nextTimeframe) || DEFAULT_TIMEFRAME;
  if (activePane.id === CHART_PANE_IDS.COMPARISON) {
    updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { timeframe });
    setComparisonTimeframe(timeframe);
    bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.COMPARISON)} ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  setPrimaryTimeframeCommand({ timeframe });
  syncActivePaneToolbarControls();
  if (store.getBars().length > 0) {
    handleLoad();
  }
}
