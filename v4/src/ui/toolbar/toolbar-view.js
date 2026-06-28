import { INSTRUMENT_OPTIONS, TIMEFRAME_MAP } from '../../config.js';
import {
  CHART_TEXT_SCALE_OPTIONS,
  DEFAULT_DISPLAY_PREFERENCES,
  INSPECTOR_DENSITY_OPTIONS,
  UI_SCALE_OPTIONS,
} from '../../display/display-preferences.js';
import { CHART_PANE_LAYOUTS } from '../../chart-panes/chart-pane-store.js';

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

export function renderSettingsPopoverContent(preferences) {
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

function renderComparisonControls({ comparisonEnabled, layout, primaryLabel, comparisonLabel }) {
  const isTwoColumn = comparisonEnabled && layout === CHART_PANE_LAYOUTS.TWO_COLUMN;
  const isSingleComparison = comparisonEnabled && layout === CHART_PANE_LAYOUTS.SINGLE_COMPARISON;
  return `
    <div class="toolbar-layout-picker">
      <button id="chartLayoutBtn" class="toolbar-btn toolbar-secondary-btn toolbar-layout-btn" type="button" title="Chart layout" aria-label="Chart layout" aria-expanded="false">
        <span class="toolbar-layout-icon ${isTwoColumn ? 'toolbar-layout-icon-two-column' : 'toolbar-layout-icon-single-right'}"></span>
      </button>
      <div id="chartLayoutPopover" class="toolbar-calendar-popover toolbar-layout-popover" hidden>
        <div class="toolbar-layout-grid">
          <button class="toolbar-layout-option ${isSingleComparison ? 'active' : ''}" type="button" data-layout-action="single-comparison" title="${escapeHtml(comparisonLabel)}">
            <span class="toolbar-layout-icon toolbar-layout-icon-single-right"></span>
          </button>
          <button class="toolbar-layout-option ${isTwoColumn ? 'active' : ''}" type="button" data-layout-action="two-column" title="${escapeHtml(primaryLabel)} + ${escapeHtml(comparisonLabel)}">
            <span class="toolbar-layout-icon toolbar-layout-icon-two-column"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderActivePaneTimeframeControls(activePane) {
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

function renderDisplayControls({ displayMode, timeOverlaySettings, gridVisible }) {
  return `
    <label class="toolbar-toggle" title="Show natural day boundary lines">
      <input id="dayBoundaryToggle" type="checkbox"${timeOverlaySettings.showDayBoundary ? ' checked' : ''} />
      <span>Days</span>
    </label>
    <label class="toolbar-toggle" title="Show original chart background grid">
      <input id="chartGridToggle" type="checkbox"${gridVisible ? ' checked' : ''} />
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

export function renderToolbarShell({
  activePane,
  comparisonEnabled,
  displayMode,
  gridVisible,
  layout,
  preferences,
  primaryLabel,
  comparisonLabel,
  timeOverlaySettings,
}) {
  return `
    <div class="toolbar-section toolbar-section-date">
      <button id="dateRangeBtn" class="toolbar-btn toolbar-secondary-btn toolbar-date-range-btn" type="button">Date Range</button>
      <input type="hidden" id="startInput" />
      <input type="hidden" id="endInput" />
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-compare">
      ${renderComparisonControls({ comparisonEnabled, layout, primaryLabel, comparisonLabel })}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-primary">
      ${renderActivePaneTimeframeControls(activePane)}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-display">
      ${renderDisplayControls({ displayMode, timeOverlaySettings, gridVisible })}
    </div>
    <div class="toolbar-separator"></div>
    <div class="toolbar-section toolbar-section-archive">
      <button id="archiveBtn" class="toolbar-btn" type="button">Archive</button>
      <button id="undoBtn" class="toolbar-btn toolbar-icon-btn" type="button" disabled title="Undo">↶</button>
      <button id="redoBtn" class="toolbar-btn toolbar-icon-btn" type="button" disabled title="Redo">↷</button>
      <button id="toolbarSettingsBtn" class="toolbar-btn toolbar-secondary-btn toolbar-icon-btn toolbar-settings-btn" type="button" title="Settings" aria-label="Settings" aria-expanded="false">⚙</button>
      <div id="toolbarSettingsPopover" class="toolbar-calendar-popover toolbar-settings-popover" hidden>
        ${renderSettingsPopoverContent(preferences)}
      </div>
    </div>
    <div class="status-bar">
      <span id="statusText">Ready</span>
    </div>
  `;
}
