export const DISPLAY_TIMEZONES = Object.freeze(['exchange', 'local', 'utc']);
export const TIME_HOUR_FORMATS = Object.freeze(['12h', '24h']);
export const DATE_PRESENTATION_FORMATS = Object.freeze([
  'yyyy/mm/dd',
  'yyyy-mm-dd',
  'dd/mm/yyyy',
  'mm/dd/yyyy',
]);

function normalizeChoice(value, choices, fallback, fieldName, strict) {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;
  if (choices.includes(normalized)) return normalized;
  if (!strict) return fallback;
  throw new Error(`Settings ${fieldName} is unsupported: ${value}`);
}

export function normalizeTimePresentationPreferences(input = {}, {
  strict = false,
} = {}) {
  return Object.freeze({
    dateFormat: normalizeChoice(
      input.dateFormat,
      DATE_PRESENTATION_FORMATS,
      'yyyy/mm/dd',
      'dateFormat',
      strict,
    ),
    displayTimezone: normalizeChoice(
      input.displayTimezone,
      DISPLAY_TIMEZONES,
      'exchange',
      'displayTimezone',
      strict,
    ),
    showDayOfWeek: input.showDayOfWeek !== false,
    timeFormat: normalizeChoice(
      input.timeFormat,
      TIME_HOUR_FORMATS,
      '24h',
      'timeFormat',
      strict,
    ),
  });
}
