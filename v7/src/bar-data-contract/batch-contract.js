import { createRawBar } from './bar-contract.js';
import { failBarDataContract } from './contract-error.js';
import { createRawBarRequest, rawBarRequestKey } from './request-contract.js';

const REQUIRED_BATCH_FIELDS = Object.freeze(['schemaVersion', 'request', 'bars']);
const BATCH_FIELDS = Object.freeze([...REQUIRED_BATCH_FIELDS, 'requestKey']);
const RAW_BAR_BATCH_BRAND = Symbol('RawBarBatch');

/**
 * Owner: Bar Data Runtime contract boundary.
 * Purpose: validate one successful provider-neutral raw response before any
 * cache, Replay, projection, or chart owner can observe it.
 * Inputs: version, complete request identity, and provider-normalized bars.
 * Outputs: deeply immutable batch with strictly increasing unique timestamps.
 * Side effects: none.
 * Errors: rejects mismatched structure, order, duplicates, and bars outside the
 * request's half-open window.
 */
export function createRawBarBatch(value) {
  if (value?.[RAW_BAR_BATCH_BRAND] === true) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failBarDataContract('INVALID_RAW_BAR_BATCH', 'Raw bar batch must be an object.');
  }
  for (const field of REQUIRED_BATCH_FIELDS) {
    if (!Object.hasOwn(value, field)) failBarDataContract('MISSING_RAW_BAR_BATCH_FIELD', `Missing raw bar batch field ${field}.`);
  }
  if (Object.keys(value).some((field) => !BATCH_FIELDS.includes(field))) {
    failBarDataContract('UNKNOWN_RAW_BAR_BATCH_FIELD', 'Raw bar batch contains an unknown field.');
  }
  if (value.schemaVersion !== 1) {
    failBarDataContract('UNSUPPORTED_RAW_BAR_BATCH_VERSION', 'Raw bar batch requires schemaVersion 1.');
  }
  const request = createRawBarRequest(value.request);
  if (!Array.isArray(value.bars)) failBarDataContract('INVALID_RAW_BAR_BATCH', 'Raw bar batch bars must be an array.');
  let previousStart = -1;
  const bars = value.bars.map((candidate) => {
    const bar = createRawBar(candidate);
    if (bar.startEpochMs < request.windowStartEpochMs || bar.startEpochMs >= request.windowEndEpochMs) {
      failBarDataContract('RAW_BAR_OUTSIDE_REQUEST_WINDOW', 'Raw bar falls outside the request window.');
    }
    if (bar.startEpochMs <= previousStart) {
      failBarDataContract('RAW_BARS_NOT_STRICTLY_ORDERED', 'Raw bars must be strictly increasing and unique.');
    }
    previousStart = bar.startEpochMs;
    return bar;
  });
  const requestKey = rawBarRequestKey(request);
  if (Object.hasOwn(value, 'requestKey') && value.requestKey !== requestKey) {
    failBarDataContract('RAW_BAR_BATCH_KEY_MISMATCH', 'Raw bar batch requestKey does not match its request.');
  }
  const batch = {
    schemaVersion: 1,
    request,
    requestKey,
    bars: Object.freeze(bars),
  };
  Object.defineProperty(batch, RAW_BAR_BATCH_BRAND, { value: true });
  return Object.freeze(batch);
}
