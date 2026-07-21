import { failBarDataContract } from './contract-error.js';

const BAR_FIELDS = Object.freeze(['startEpochMs', 'open', 'high', 'low', 'close', 'volume']);
const RAW_BAR_BRAND = Symbol('RawBar');

export function isValidatedRawBar(value) {
  return value?.[RAW_BAR_BRAND] === true;
}

function requireFinite(value, field) {
  if (!Number.isFinite(value)) failBarDataContract('INVALID_RAW_BAR_PRICE', `${field} must be finite.`);
  return value;
}

/**
 * Owner: Bar Data Runtime contract boundary.
 * Purpose: validate one provider-normalized raw OHLCV bar.
 * Inputs: exact six-field bar with epoch-millisecond start and nullable volume.
 * Outputs: immutable normalized bar.
 * Side effects: none.
 * Errors: rejects structural, timestamp, price-envelope, and volume violations.
 */
export function createRawBar(value) {
  if (isValidatedRawBar(value)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failBarDataContract('INVALID_RAW_BAR', 'Raw bar must be an object.');
  }
  for (const field of BAR_FIELDS) {
    if (!Object.hasOwn(value, field)) failBarDataContract('MISSING_RAW_BAR_FIELD', `Missing raw bar field ${field}.`);
  }
  if (Object.keys(value).some((field) => !BAR_FIELDS.includes(field))) {
    failBarDataContract('UNKNOWN_RAW_BAR_FIELD', 'Raw bar contains an unknown field.');
  }
  if (!Number.isSafeInteger(value.startEpochMs) || value.startEpochMs < 0) {
    failBarDataContract('INVALID_RAW_BAR_TIMESTAMP', 'startEpochMs must be a non-negative safe integer.');
  }
  const open = requireFinite(value.open, 'open');
  const high = requireFinite(value.high, 'high');
  const low = requireFinite(value.low, 'low');
  const close = requireFinite(value.close, 'close');
  if (high < Math.max(open, low, close) || low > Math.min(open, high, close)) {
    failBarDataContract('INVALID_RAW_BAR_ENVELOPE', 'Raw bar high/low must contain open and close.');
  }
  if (value.volume !== null && (!Number.isFinite(value.volume) || value.volume < 0)) {
    failBarDataContract('INVALID_RAW_BAR_VOLUME', 'volume must be null or a non-negative finite number.');
  }
  const bar = { startEpochMs: value.startEpochMs, open, high, low, close, volume: value.volume };
  Object.defineProperty(bar, RAW_BAR_BRAND, { value: true });
  return Object.freeze(bar);
}
