export const DEFAULT_SETTINGS_INPUT = Object.freeze({
  chartAxisBorderColor: '#163345',
  chartBackgroundColor: '#0f1721',
  chartCrosshairColor: '#758696',
  chartDaySeparators: 'off',
  chartGrid: true,
  chartGridColor: '#263441',
  chartIctDaySeparatorColor: '#a855f7',
  chartIctDaySeparatorStyle: 'dotted',
  chartNavigationVisibility: 'hover',
  chartBottomMarginPercent: 8,
  chartRightMarginBars: 8,
  chartScaleFontSize: 12,
  chartScaleTextColor: '#c9d6df',
  chartTopMarginPercent: 10,
  chartTradingDaySeparatorColor: '#3b82f6',
  chartTradingDaySeparatorStyle: 'dashed',
  displayTimezone: 'exchange',
  showWatermark: true,
  theme: 'dark',
});

export const SETTINGS_RECORD_VERSION = 4;

const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS_INPUT));
const THEMES = Object.freeze(['dark', 'light']);
const TIMEZONES = Object.freeze(['exchange', 'local', 'utc']);
const NAVIGATION_VISIBILITY = Object.freeze(['hover', 'always', 'hidden']);
const DAY_SEPARATORS = Object.freeze(['off', 'trading', 'ict', 'both']);
const LINE_STYLES = Object.freeze(['solid', 'dashed', 'dotted']);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeChoice(value, choices, fallback, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  if (!choices.includes(normalized)) {
    throw new Error(`Settings ${fieldName} is unsupported: ${value}`);
  }
  return normalized;
}

function normalizeColor(value, fallback, fieldName) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (!COLOR_PATTERN.test(normalized)) {
    throw new Error(`Settings ${fieldName} must be a six-digit hex color: ${value}`);
  }
  return normalized;
}

function normalizeInteger(value, fallback, fieldName, { min, max }) {
  if (value === '' || value == null) return fallback;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new Error(`Settings ${fieldName} must be an integer from ${min} to ${max}: ${value}`);
  }
  return normalized;
}

export function createSettingsRecord(input = {}) {
  return Object.freeze({
    chartAxisBorderColor: normalizeColor(
      input.chartAxisBorderColor,
      DEFAULT_SETTINGS_INPUT.chartAxisBorderColor,
      'chartAxisBorderColor',
    ),
    chartBackgroundColor: normalizeColor(
      input.chartBackgroundColor,
      DEFAULT_SETTINGS_INPUT.chartBackgroundColor,
      'chartBackgroundColor',
    ),
    chartCrosshairColor: normalizeColor(
      input.chartCrosshairColor,
      DEFAULT_SETTINGS_INPUT.chartCrosshairColor,
      'chartCrosshairColor',
    ),
    chartDaySeparators: normalizeChoice(
      input.chartDaySeparators,
      DAY_SEPARATORS,
      DEFAULT_SETTINGS_INPUT.chartDaySeparators,
      'chartDaySeparators',
    ),
    chartGrid: normalizeBoolean(input.chartGrid, DEFAULT_SETTINGS_INPUT.chartGrid),
    chartGridColor: normalizeColor(
      input.chartGridColor,
      DEFAULT_SETTINGS_INPUT.chartGridColor,
      'chartGridColor',
    ),
    chartIctDaySeparatorColor: normalizeColor(
      input.chartIctDaySeparatorColor,
      DEFAULT_SETTINGS_INPUT.chartIctDaySeparatorColor,
      'chartIctDaySeparatorColor',
    ),
    chartIctDaySeparatorStyle: normalizeChoice(
      input.chartIctDaySeparatorStyle,
      LINE_STYLES,
      DEFAULT_SETTINGS_INPUT.chartIctDaySeparatorStyle,
      'chartIctDaySeparatorStyle',
    ),
    chartNavigationVisibility: normalizeChoice(
      input.chartNavigationVisibility,
      NAVIGATION_VISIBILITY,
      DEFAULT_SETTINGS_INPUT.chartNavigationVisibility,
      'chartNavigationVisibility',
    ),
    chartBottomMarginPercent: normalizeInteger(
      input.chartBottomMarginPercent,
      DEFAULT_SETTINGS_INPUT.chartBottomMarginPercent,
      'chartBottomMarginPercent',
      { min: 0, max: 40 },
    ),
    chartRightMarginBars: normalizeInteger(
      input.chartRightMarginBars,
      DEFAULT_SETTINGS_INPUT.chartRightMarginBars,
      'chartRightMarginBars',
      { min: 0, max: 100 },
    ),
    chartScaleFontSize: normalizeInteger(
      input.chartScaleFontSize,
      DEFAULT_SETTINGS_INPUT.chartScaleFontSize,
      'chartScaleFontSize',
      { min: 10, max: 20 },
    ),
    chartScaleTextColor: normalizeColor(
      input.chartScaleTextColor,
      DEFAULT_SETTINGS_INPUT.chartScaleTextColor,
      'chartScaleTextColor',
    ),
    chartTopMarginPercent: normalizeInteger(
      input.chartTopMarginPercent,
      DEFAULT_SETTINGS_INPUT.chartTopMarginPercent,
      'chartTopMarginPercent',
      { min: 0, max: 40 },
    ),
    chartTradingDaySeparatorColor: normalizeColor(
      input.chartTradingDaySeparatorColor,
      DEFAULT_SETTINGS_INPUT.chartTradingDaySeparatorColor,
      'chartTradingDaySeparatorColor',
    ),
    chartTradingDaySeparatorStyle: normalizeChoice(
      input.chartTradingDaySeparatorStyle,
      LINE_STYLES,
      DEFAULT_SETTINGS_INPUT.chartTradingDaySeparatorStyle,
      'chartTradingDaySeparatorStyle',
    ),
    displayTimezone: normalizeChoice(
      input.displayTimezone,
      TIMEZONES,
      DEFAULT_SETTINGS_INPUT.displayTimezone,
      'displayTimezone',
    ),
    showWatermark: normalizeBoolean(input.showWatermark, DEFAULT_SETTINGS_INPUT.showWatermark),
    theme: normalizeChoice(input.theme, THEMES, DEFAULT_SETTINGS_INPUT.theme, 'theme'),
  });
}

export function updateSettingsRecord(settings, patch = {}) {
  const unknownKeys = Object.keys(patch).filter((key) => !SETTING_KEYS.includes(key));
  if (unknownKeys.length) {
    throw new Error(`Unsupported settings keys: ${unknownKeys.join(', ')}`);
  }
  return createSettingsRecord({
    ...settings,
    ...patch,
  });
}

export function createSettingsPersistenceValue(settings = {}) {
  return Object.freeze({
    settings: createSettingsRecord(settings),
    version: SETTINGS_RECORD_VERSION,
  });
}

export function restoreSettingsPersistenceValue(value) {
  if (value == null) {
    return Object.freeze({
      migrated: false,
      settings: createSettingsRecord(),
    });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Settings persistence value must be an object.');
  }
  if (!Object.hasOwn(value, 'version')) {
    return Object.freeze({
      migrated: true,
      settings: createSettingsRecord(value),
    });
  }
  if (![1, 2, 3, SETTINGS_RECORD_VERSION].includes(value.version)) {
    throw new Error(`Unsupported Settings record version: ${value.version}`);
  }
  return Object.freeze({
    migrated: value.version !== SETTINGS_RECORD_VERSION,
    settings: createSettingsRecord(value.settings),
  });
}
