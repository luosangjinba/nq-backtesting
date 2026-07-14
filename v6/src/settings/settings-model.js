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
  currentPriceLineVisible: true,
  currentPriceNameVisible: true,
  currentPriceValueVisible: true,
  displayTimezone: 'exchange',
  showWatermark: true,
  symbolBordersVisible: false,
  symbolDownBodyColor: '#f25f68',
  symbolDownBorderColor: '#f25f68',
  symbolDownWickColor: '#c94c58',
  symbolPricePrecision: 'auto',
  symbolUpBodyColor: '#36b7a8',
  symbolUpBorderColor: '#36b7a8',
  symbolUpWickColor: '#2a958b',
  statusBackgroundColor: '#0f1721',
  statusBackgroundOpacityPercent: 0,
  statusBarChangeVisible: true,
  statusOhlcVisible: true,
  statusTitleMode: 'ticker',
  theme: 'dark',
  timeFormat: '24h',
});

export const SETTINGS_RECORD_VERSION = 8;

const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS_INPUT));
const THEMES = Object.freeze(['dark', 'light']);
const TIMEZONES = Object.freeze(['exchange', 'local', 'utc']);
const NAVIGATION_VISIBILITY = Object.freeze(['hover', 'always', 'hidden']);
const DAY_SEPARATORS = Object.freeze(['off', 'trading', 'ict', 'both']);
const LINE_STYLES = Object.freeze(['solid', 'dashed', 'dotted']);
const PRICE_PRECISIONS = Object.freeze(['auto', '0', '1', '2', '3', '4', '5', '6']);
const STATUS_TITLE_MODES = Object.freeze(['hidden', 'ticker']);
const TIME_FORMATS = Object.freeze(['12h', '24h']);
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
    currentPriceLineVisible: normalizeBoolean(
      input.currentPriceLineVisible,
      DEFAULT_SETTINGS_INPUT.currentPriceLineVisible,
    ),
    currentPriceNameVisible: normalizeBoolean(
      input.currentPriceNameVisible,
      DEFAULT_SETTINGS_INPUT.currentPriceNameVisible,
    ),
    currentPriceValueVisible: normalizeBoolean(
      input.currentPriceValueVisible,
      DEFAULT_SETTINGS_INPUT.currentPriceValueVisible,
    ),
    displayTimezone: normalizeChoice(
      input.displayTimezone,
      TIMEZONES,
      DEFAULT_SETTINGS_INPUT.displayTimezone,
      'displayTimezone',
    ),
    showWatermark: normalizeBoolean(input.showWatermark, DEFAULT_SETTINGS_INPUT.showWatermark),
    symbolBordersVisible: normalizeBoolean(
      input.symbolBordersVisible,
      DEFAULT_SETTINGS_INPUT.symbolBordersVisible,
    ),
    symbolDownBodyColor: normalizeColor(
      input.symbolDownBodyColor,
      DEFAULT_SETTINGS_INPUT.symbolDownBodyColor,
      'symbolDownBodyColor',
    ),
    symbolDownBorderColor: normalizeColor(
      input.symbolDownBorderColor,
      DEFAULT_SETTINGS_INPUT.symbolDownBorderColor,
      'symbolDownBorderColor',
    ),
    symbolDownWickColor: normalizeColor(
      input.symbolDownWickColor,
      DEFAULT_SETTINGS_INPUT.symbolDownWickColor,
      'symbolDownWickColor',
    ),
    symbolPricePrecision: normalizeChoice(
      input.symbolPricePrecision,
      PRICE_PRECISIONS,
      DEFAULT_SETTINGS_INPUT.symbolPricePrecision,
      'symbolPricePrecision',
    ),
    symbolUpBodyColor: normalizeColor(
      input.symbolUpBodyColor,
      DEFAULT_SETTINGS_INPUT.symbolUpBodyColor,
      'symbolUpBodyColor',
    ),
    symbolUpBorderColor: normalizeColor(
      input.symbolUpBorderColor,
      DEFAULT_SETTINGS_INPUT.symbolUpBorderColor,
      'symbolUpBorderColor',
    ),
    symbolUpWickColor: normalizeColor(
      input.symbolUpWickColor,
      DEFAULT_SETTINGS_INPUT.symbolUpWickColor,
      'symbolUpWickColor',
    ),
    statusBackgroundColor: normalizeColor(
      input.statusBackgroundColor,
      DEFAULT_SETTINGS_INPUT.statusBackgroundColor,
      'statusBackgroundColor',
    ),
    statusBackgroundOpacityPercent: normalizeInteger(
      input.statusBackgroundOpacityPercent,
      DEFAULT_SETTINGS_INPUT.statusBackgroundOpacityPercent,
      'statusBackgroundOpacityPercent',
      { min: 0, max: 100 },
    ),
    statusBarChangeVisible: normalizeBoolean(
      input.statusBarChangeVisible,
      DEFAULT_SETTINGS_INPUT.statusBarChangeVisible,
    ),
    statusOhlcVisible: normalizeBoolean(
      input.statusOhlcVisible,
      DEFAULT_SETTINGS_INPUT.statusOhlcVisible,
    ),
    statusTitleMode: normalizeChoice(
      input.statusTitleMode,
      STATUS_TITLE_MODES,
      DEFAULT_SETTINGS_INPUT.statusTitleMode,
      'statusTitleMode',
    ),
    theme: normalizeChoice(input.theme, THEMES, DEFAULT_SETTINGS_INPUT.theme, 'theme'),
    timeFormat: normalizeChoice(
      input.timeFormat,
      TIME_FORMATS,
      DEFAULT_SETTINGS_INPUT.timeFormat,
      'timeFormat',
    ),
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
  if (![1, 2, 3, 4, 5, 6, 7, SETTINGS_RECORD_VERSION].includes(value.version)) {
    throw new Error(`Unsupported Settings record version: ${value.version}`);
  }
  return Object.freeze({
    migrated: value.version !== SETTINGS_RECORD_VERSION,
    settings: createSettingsRecord(value.settings),
  });
}
