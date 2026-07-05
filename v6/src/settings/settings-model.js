export const DEFAULT_SETTINGS_INPUT = Object.freeze({
  chartGrid: true,
  displayTimezone: 'exchange',
  showWatermark: true,
  theme: 'dark',
});

const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS_INPUT));
const THEMES = Object.freeze(['dark', 'light']);
const TIMEZONES = Object.freeze(['exchange', 'local', 'utc']);

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

export function createSettingsRecord(input = {}) {
  return Object.freeze({
    chartGrid: normalizeBoolean(input.chartGrid, DEFAULT_SETTINGS_INPUT.chartGrid),
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
