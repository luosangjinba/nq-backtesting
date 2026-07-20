import { failProjection } from './projection-error.js';

const BAR_FIELDS = Object.freeze(['startEpochMs', 'open', 'high', 'low', 'close', 'volume']);

function requireFinite(value, field) {
  if (!Number.isFinite(value)) {
    failProjection('PROJECTED_BAR_PRICE_INVALID', `Projected ${field} must be finite.`);
  }
  return value;
}

export function createProjectedBar(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failProjection('PROJECTED_BAR_INVALID', 'Projected bar must be an object.');
  }
  if (Object.keys(value).sort().join(',') !== [...BAR_FIELDS].sort().join(',')) {
    failProjection('PROJECTED_BAR_FIELDS', 'Projected bar must contain the exact OHLCV fields.');
  }
  if (!Number.isSafeInteger(value.startEpochMs) || value.startEpochMs < 0) {
    failProjection('PROJECTED_BAR_TIMESTAMP_INVALID', 'Projected bar timestamp is invalid.');
  }
  const open = requireFinite(value.open, 'open');
  const high = requireFinite(value.high, 'high');
  const low = requireFinite(value.low, 'low');
  const close = requireFinite(value.close, 'close');
  if (high < Math.max(open, low, close) || low > Math.min(open, high, close)) {
    failProjection('PROJECTED_BAR_ENVELOPE_INVALID', 'Projected high/low must contain open and close.');
  }
  if (value.volume !== null && (!Number.isFinite(value.volume) || value.volume < 0)) {
    failProjection('PROJECTED_BAR_VOLUME_INVALID', 'Projected volume must be null or non-negative.');
  }
  return Object.freeze({ startEpochMs: value.startEpochMs, open, high, low, close, volume: value.volume });
}

export function normalizeProjectedBars(values, exclusiveCursorEpochMs) {
  if (!Array.isArray(values) || values.length === 0) {
    failProjection('PROJECTION_OUTPUT_EMPTY', 'Aggregation policy must return at least one projected bar.');
  }
  let previousStart = -1;
  const bars = values.map((value) => {
    const bar = createProjectedBar(value);
    if (bar.startEpochMs <= previousStart) {
      failProjection('PROJECTION_OUTPUT_NOT_ORDERED', 'Projected bars must be strictly ordered and unique.');
    }
    if (bar.startEpochMs >= exclusiveCursorEpochMs) {
      failProjection('PROJECTION_OUTPUT_FUTURE_BAR', 'Projected output exceeds the exclusive Replay cursor.');
    }
    previousStart = bar.startEpochMs;
    return bar;
  });
  return Object.freeze(bars);
}
