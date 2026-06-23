// Toolbar UI: date range, chart settings, display filters, and status text.

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME, INSTRUMENT_OPTIONS, TIMEFRAME_MAP } from '../config.js';
import { fetchBars } from '../api.js';
import * as chartManager from '../chart/chart-manager.js';
import { isGridVisible, setGridVisible } from '../chart/grid-visibility.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument, setPrimaryInstrument } from '../data/primary-instrument-store.js';
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
  setChartPaneLayout,
  updatePaneDescriptor,
} from '../chart-panes/chart-pane-store.js';
import { resolveChartLoadRange } from '../data/load-range-policy.js';
import { formatTimeInput } from '../utils.js';
import { getDisplayMode, updateDisplayMode } from '../display/display-mode.js';
import {
  CHART_TEXT_SCALE_OPTIONS,
  DEFAULT_DISPLAY_PREFERENCES,
  INSPECTOR_DENSITY_OPTIONS,
  UI_SCALE_OPTIONS,
  getDisplayPreferences,
  resetDisplayPreferences,
  setDisplayPreferences,
} from '../display/display-preferences.js';
import { getTimeOverlaySettings, updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { canRedo, canUndo, getRedoLabel, getUndoLabel, redo, undo } from '../history/history-manager.js';
import { initCalendarNavigator } from './calendar-navigator.js';

const UI_SCALE_LABELS = {
  100: '100%',
  110: '110%',
  125: '125%',
  140: '140%',
};

const CHART_TEXT_LABELS = {
  normal: 'Normal',
  large: 'Large',
  xl: 'XL',
};

const INSPECTOR_DENSITY_LABELS = {
  compact: 'Compact',
  normal: 'Normal',
  comfortable: 'Comfortable',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderSettingsOptions(options, labels, current) {
  return options
    .map((option) => {
      const selected = option === current ? ' selected' : '';
      return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(labels[option] || option)}</option>`;
    })
    .join('');
}

function renderSettingsSelect(label, action, options, labels, current) {
  return `
    <label class="toolbar-settings-field">
      <span class="toolbar-settings-label">${escapeHtml(label)}</span>
      <select class="toolbar-select toolbar-settings-select" data-display-action="${escapeHtml(action)}">
        ${renderSettingsOptions(options, labels, current)}
      </select>
    </label>
  `;
}

function renderSettingsPopoverContent() {
  const preferences = getDisplayPreferences();
  const defaults = DEFAULT_DISPLAY_PREFERENCES;
  const isDefault =
    preferences.uiScale === defaults.uiScale &&
    preferences.chartTextScale === defaults.chartTextScale &&
    preferences.inspectorDensity === defaults.inspectorDensity;

  return `
    <div class="toolbar-settings-header">
      <div class="toolbar-settings-title">Display Setup</div>
      <div class="toolbar-settings-subtitle">Local display preferences</div>
    </div>
    <div class="toolbar-settings-grid">
      ${renderSettingsSelect('UI Scale', 'ui-scale', UI_SCALE_OPTIONS, UI_SCALE_LABELS, preferences.uiScale)}
      ${renderSettingsSelect(
        'Chart Text',
        'chart-text-scale',
        CHART_TEXT_SCALE_OPTIONS,
        CHART_TEXT_LABELS,
        preferences.chartTextScale
      )}
      ${renderSettingsSelect(
        'Inspector',
        'inspector-density',
        INSPECTOR_DENSITY_OPTIONS,
        INSPECTOR_DENSITY_LABELS,
        preferences.inspectorDensity
      )}
    </div>
    <button class="toolbar-btn toolbar-secondary-btn toolbar-settings-reset" data-display-action="reset-defaults" type="button" ${isDefault ? 'disabled' : ''}>
      Reset defaults
    </button>
  `;
}

function renderInstrumentOptions(selectedInstrument) {
  return INSTRUMENT_OPTIONS.map(
    (instrument) =>
      `<option value="${instrument}"${instrument === selectedInstrument ? ' selected' : ''}>${instrument}</option>`
  ).join('\n        ');
}

function renderComparisonControls() {
  const comparisonEnabled = isComparisonWindowEnabled();
  return `
    <label class="toolbar-toggle" title="Show sliding comparison window">
      <input id="comparisonWindowToggle" type="checkbox"${comparisonEnabled ? ' checked' : ''} />
      <span>Compare</span>
    </label>
  `;
}

function renderActivePaneTimeframeControls() {
  const activePane = getActivePane();
  return `
    <div class="toolbar-group">
      <span class="toolbar-label">Pane:</span>
      <select id="primaryInstrumentSelect" class="toolbar-select" title="Active pane instrument">
        ${renderInstrumentOptions(activePane.instrument)}
      </select>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">TF:</span>
      <select id="tfSelect" class="toolbar-select" title="Active pane timeframe">
        ${Object.entries(TIMEFRAME_MAP)
          .map(
            ([v, l]) =>
              `<option value="${v}"${parseInt(v) === Number(activePane.timeframe) ? ' selected' : ''}>${l}</option>`
          )
          .join('\n        ')}
      </select>
    </div>
  `;
}

function renderDisplayControls(displayMode) {
  const timeOverlaySettings = getTimeOverlaySettings();
  return `
    <label class="toolbar-toggle" title="Show natural day boundary lines">
      <input id="dayBoundaryToggle" type="checkbox"${timeOverlaySettings.showDayBoundary ? ' checked' : ''} />
      <span>Days</span>
    </label>
    <label class="toolbar-toggle" title="Show original chart background grid">
      <input id="chartGridToggle" type="checkbox"${isGridVisible() ? ' checked' : ''} />
      <span>Grid</span>
    </label>
    <div class="toolbar-group">
      <span class="toolbar-label">Segments:</span>
      <select id="displayModeSelect" class="toolbar-select toolbar-display-select" title="Chart display mode">
        <option value="all"${displayMode.mode === 'all' ? ' selected' : ''}>All</option>
        <option value="selected-pda"${displayMode.mode === 'selected-pda' ? ' selected' : ''}>Selected PDA</option>
        <option value="recent-workspace"${displayMode.mode === 'recent-workspace' ? ' selected' : ''}>Recent Workspace</option>
      </select>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">N:</span>
      <input id="displayRecentCountInput" class="toolbar-input toolbar-number-input" type="number" min="1" max="50" step="1" value="${displayMode.recentCount}" title="Recent segment/composite count" />
    </div>
  `;
}

export function initToolbar() {
  const container = document.getElementById('toolbar');
  const displayMode = getDisplayMode();
  syncPaneStateFromComparison();

  container.innerHTML = `
    <div class="toolbar-section toolbar-section-date">
      <button id="dateRangeBtn" class="toolbar-btn toolbar-secondary-btn toolbar-date-range-btn" type="button">Date Range</button>
      <input type="hidden" id="startInput" />
      <input type="hidden" id="endInput" />
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-compare">
      ${renderComparisonControls()}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-primary">
      ${renderActivePaneTimeframeControls()}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-display">
      ${renderDisplayControls(displayMode)}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-archive">
      <button id="archiveBtn" class="toolbar-btn" type="button">Archive</button>
      <button id="undoBtn" class="toolbar-btn toolbar-icon-btn" type="button" disabled title="Undo">↶</button>
      <button id="redoBtn" class="toolbar-btn toolbar-icon-btn" type="button" disabled title="Redo">↷</button>
      <button id="toolbarSettingsBtn" class="toolbar-btn toolbar-secondary-btn toolbar-icon-btn toolbar-settings-btn" type="button" title="Settings" aria-label="Settings" aria-expanded="false">⚙</button>
      <div id="toolbarSettingsPopover" class="toolbar-calendar-popover toolbar-settings-popover" hidden>
        ${renderSettingsPopoverContent()}
      </div>
    </div>
    <div class="status-bar">
      <span id="statusText">Ready</span>
    </div>
  `;

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
  const comparisonWindowToggle = document.getElementById('comparisonWindowToggle');
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
  // Keep hidden range fields normalized for reloads triggered by Main TF.
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

  comparisonWindowToggle.addEventListener('change', (e) => {
    setComparisonWindowEnabled(e.target.checked);
    setChartPaneLayout(e.target.checked ? CHART_PANE_LAYOUTS.TWO_COLUMN : CHART_PANE_LAYOUTS.SINGLE);
    syncComparisonWindowToggle();
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
    syncComparisonWindowToggle();
    syncPaneStateFromComparison(state);
  });
  bus.on('primary-instrument:changed', ({ instrument }) => {
    updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { instrument });
    const select = document.getElementById('primaryInstrumentSelect');
    if (select && getActivePane().id === CHART_PANE_IDS.PRIMARY) select.value = instrument;
  });
  bus.on('chart-panes:changed', syncActivePaneToolbarControls);
  bus.on('display-preferences:changed', renderSettingsPopover);
  document.addEventListener('click', closeSettingsPopover);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsPopover();
  });
  updateHistoryButtons();
}

function syncComparisonWindowToggle() {
  const comparisonWindowToggle = document.getElementById('comparisonWindowToggle');
  if (comparisonWindowToggle) {
    comparisonWindowToggle.checked = isComparisonWindowEnabled();
  }
}

function syncPaneStateFromComparison(state = getComparisonWindowState()) {
  setChartPaneLayout(state.enabled ? CHART_PANE_LAYOUTS.TWO_COLUMN : CHART_PANE_LAYOUTS.SINGLE);
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
  popover.innerHTML = renderSettingsPopoverContent();
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
  const tf = parseInt(document.getElementById('tfSelect').value);
  const instrument = getPrimaryInstrument();
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { instrument, timeframe: tf });

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
    const result = await fetchBars(loadRange.start, loadRange.end, tf, instrument);
    store.setBars(result.bars, loadRange.start, loadRange.end, tf, result.requestedRange, {
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
    bus.emit('status:update', { text: `Pane 2 ${descriptor.instrument}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  const instrument = setPrimaryInstrument(nextInstrument);
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { instrument });
  bus.emit('status:update', { text: `Pane 1 ${instrument}`, isError: false });
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
    bus.emit('status:update', { text: `Pane 2 ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { timeframe });
  syncActivePaneToolbarControls();
  if (store.getBars().length > 0) {
    handleLoad();
  }
}
