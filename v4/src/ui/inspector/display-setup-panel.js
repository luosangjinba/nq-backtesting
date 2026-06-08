import {
  CHART_TEXT_SCALE_OPTIONS,
  DEFAULT_DISPLAY_PREFERENCES,
  INSPECTOR_DENSITY_OPTIONS,
  UI_SCALE_OPTIONS,
  getDisplayPreferences,
} from '../../display/display-preferences.js';
import { escapeHtml, section } from './render-utils.js';

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

function renderOptions(options, labels, current) {
  return options
    .map((option) => {
      const selected = option === current ? ' selected' : '';
      return `<option value="${escapeHtml(option)}"${selected}>${escapeHtml(labels[option] || option)}</option>`;
    })
    .join('');
}

function selectField(label, action, options, labels, current) {
  return `
    <label class="inspector-field inspector-control-field display-setup-field">
      <span class="inspector-field-label">${escapeHtml(label)}</span>
      <span class="inspector-field-value">
        <select class="inspector-input display-setup-select" data-inspector-action="${escapeHtml(action)}">
          ${renderOptions(options, labels, current)}
        </select>
      </span>
    </label>
  `;
}

export function renderDisplaySetupPanel() {
  const preferences = getDisplayPreferences();
  const defaults = DEFAULT_DISPLAY_PREFERENCES;
  const isDefault =
    preferences.uiScale === defaults.uiScale &&
    preferences.chartTextScale === defaults.chartTextScale &&
    preferences.inspectorDensity === defaults.inspectorDensity;

  return section(
    'Display Setup',
    `
      <div class="display-setup-panel">
        ${selectField('UI Scale', 'display-ui-scale', UI_SCALE_OPTIONS, UI_SCALE_LABELS, preferences.uiScale)}
        ${selectField(
          'Chart Text',
          'display-chart-text-scale',
          CHART_TEXT_SCALE_OPTIONS,
          CHART_TEXT_LABELS,
          preferences.chartTextScale
        )}
        ${selectField(
          'Inspector',
          'display-inspector-density',
          INSPECTOR_DENSITY_OPTIONS,
          INSPECTOR_DENSITY_LABELS,
          preferences.inspectorDensity
        )}
        <button class="inspector-secondary display-setup-reset" data-inspector-action="display-reset-defaults" type="button" ${isDefault ? 'disabled' : ''}>
          Reset defaults
        </button>
      </div>
    `
  );
}
