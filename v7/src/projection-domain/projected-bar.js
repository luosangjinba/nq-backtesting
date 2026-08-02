import { failProjection } from './projection-error.js';

const BASE_BAR_FIELDS = Object.freeze(['startEpochMs', 'open', 'high', 'low', 'close', 'volume']);
const PROJECTED_BAR_FIELDS = Object.freeze([...BASE_BAR_FIELDS, 'displayEpochMs', 'labelDate']);
const DATE_LABEL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function validFields(value) {
  return BASE_BAR_FIELDS.every((field) => Object.hasOwn(value, field))
    && Object.keys(value).every((field) => PROJECTED_BAR_FIELDS.includes(field));
}

function requireFinite(value, field) {
  if (!Number.isFinite(value)) {
    failProjection('PROJECTED_BAR_PRICE_INVALID', `Projected ${field} must be finite.`);
  }
  return value;
}

function requireLabelDate(value) {
  if (value === undefined || value === null) return null;
  const match = typeof value === 'string' ? DATE_LABEL_PATTERN.exec(value) : null;
  if (!match) failProjection('PROJECTED_BAR_LABEL_DATE_INVALID', 'Projected label date is invalid.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== value) {
    failProjection('PROJECTED_BAR_LABEL_DATE_INVALID', 'Projected label date is invalid.');
  }
  return value;
}

export function createProjectedBar(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failProjection('PROJECTED_BAR_INVALID', 'Projected bar must be an object.');
  }
  if (!validFields(value)) {
    failProjection('PROJECTED_BAR_FIELDS', 'Projected bar contains invalid OHLCV or presentation fields.');
  }
  if (!Number.isSafeInteger(value.startEpochMs) || value.startEpochMs < 0) {
    failProjection('PROJECTED_BAR_TIMESTAMP_INVALID', 'Projected bar timestamp is invalid.');
  }
  const displayEpochMs = value.displayEpochMs ?? value.startEpochMs;
  if (!Number.isSafeInteger(displayEpochMs) || displayEpochMs < value.startEpochMs) {
    failProjection('PROJECTED_BAR_DISPLAY_TIMESTAMP_INVALID', 'Projected display timestamp is invalid.');
  }
  const open = requireFinite(value.open, 'open');
  const high = requireFinite(value.high, 'high');
  const low = requireFinite(value.low, 'low');
  const close = requireFinite(value.close, 'close');
  const labelDate = requireLabelDate(value.labelDate);
  if (high < Math.max(open, low, close) || low > Math.min(open, high, close)) {
    failProjection('PROJECTED_BAR_ENVELOPE_INVALID', 'Projected high/low must contain open and close.');
  }
  if (value.volume !== null && (!Number.isFinite(value.volume) || value.volume < 0)) {
    failProjection('PROJECTED_BAR_VOLUME_INVALID', 'Projected volume must be null or non-negative.');
  }
  return Object.freeze({
    startEpochMs: value.startEpochMs,
    displayEpochMs,
    labelDate,
    open,
    high,
    low,
    close,
    volume: value.volume,
  });
}

export function normalizeProjectedBars(values, exclusiveCursorEpochMs) {
  if (!Array.isArray(values) || values.length === 0) {
    failProjection('PROJECTION_OUTPUT_EMPTY', 'Aggregation policy must return at least one projected bar.');
  }
  let previousStart = -1;
  let previousDisplay = -1;
  const bars = values.map((value) => {
    const bar = createProjectedBar(value);
    if (bar.startEpochMs <= previousStart) {
      failProjection('PROJECTION_OUTPUT_NOT_ORDERED', 'Projected bars must be strictly ordered and unique.');
    }
    if (bar.displayEpochMs <= previousDisplay) {
      failProjection('PROJECTION_OUTPUT_DISPLAY_NOT_ORDERED', 'Projected display times must be strictly ordered and unique.');
    }
    if (bar.startEpochMs >= exclusiveCursorEpochMs) {
      failProjection('PROJECTION_OUTPUT_FUTURE_BAR', 'Projected output exceeds the exclusive Replay cursor.');
    }
    previousStart = bar.startEpochMs;
    previousDisplay = bar.displayEpochMs;
    return bar;
  });
  return Object.freeze(bars);
}
