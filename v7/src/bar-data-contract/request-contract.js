import { failBarDataContract } from './contract-error.js';

const CAPABILITY_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const REQUEST_FIELDS = Object.freeze([
  'schemaVersion', 'providerId', 'instrumentId', 'sourceResolutionId',
  'windowStartEpochMs', 'windowEndEpochMs', 'datasetRevision',
]);

function requireExactRecord(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failBarDataContract('INVALID_RAW_BAR_REQUEST', 'Raw bar request must be an object.');
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      failBarDataContract('MISSING_RAW_BAR_REQUEST_FIELD', `Missing raw bar request field ${field}.`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) {
      failBarDataContract('UNKNOWN_RAW_BAR_REQUEST_FIELD', `Unknown raw bar request field ${field}.`);
    }
  }
}

function requireCapabilityId(value, field) {
  if (typeof value !== 'string' || !CAPABILITY_ID_PATTERN.test(value)) {
    failBarDataContract('INVALID_RAW_BAR_IDENTITY', `${field} must be a namespaced capability id.`);
  }
  return value;
}

function requireEpoch(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failBarDataContract('INVALID_RAW_BAR_WINDOW', `${field} must be a non-negative safe integer.`);
  }
  return value;
}

function requireRevision(value) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    failBarDataContract('INVALID_DATASET_REVISION', 'datasetRevision must be a non-empty exact string.');
  }
  return value;
}

/**
 * Owner: Bar Data Runtime contract boundary.
 * Purpose: normalize the complete Session-independent identity of one bounded
 * raw-bar acquisition.
 * Inputs: provider/instrument/resolution capability ids, half-open epoch window,
 * and exact dataset revision.
 * Outputs: immutable version-one request value.
 * Side effects: none.
 * Errors: BarDataContractError for missing, unknown, or invalid fields.
 * Protected invariant: Session, Replay, pane, display timeframe, and
 * session-hours mode can never become implicit raw-cache identity.
 */
export function createRawBarRequest(value) {
  requireExactRecord(value, REQUEST_FIELDS);
  if (value.schemaVersion !== 1) {
    failBarDataContract('UNSUPPORTED_RAW_BAR_REQUEST_VERSION', 'Raw bar request requires schemaVersion 1.');
  }
  const windowStartEpochMs = requireEpoch(value.windowStartEpochMs, 'windowStartEpochMs');
  const windowEndEpochMs = requireEpoch(value.windowEndEpochMs, 'windowEndEpochMs');
  if (windowStartEpochMs >= windowEndEpochMs) {
    failBarDataContract('INVALID_RAW_BAR_WINDOW', 'Raw bar request window must increase.');
  }
  return Object.freeze({
    schemaVersion: 1,
    providerId: requireCapabilityId(value.providerId, 'providerId'),
    instrumentId: requireCapabilityId(value.instrumentId, 'instrumentId'),
    sourceResolutionId: requireCapabilityId(value.sourceResolutionId, 'sourceResolutionId'),
    windowStartEpochMs,
    windowEndEpochMs,
    datasetRevision: requireRevision(value.datasetRevision),
  });
}

/** Return a stable serialization of the complete raw-request cache identity. */
export function rawBarRequestKey(value) {
  const request = createRawBarRequest(value);
  return JSON.stringify([
    request.providerId, request.instrumentId, request.sourceResolutionId,
    request.windowStartEpochMs, request.windowEndEpochMs, request.datasetRevision,
  ]);
}
