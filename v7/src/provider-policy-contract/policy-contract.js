import { failProviderPolicy } from './policy-error.js';

const ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/;
const REVISION_MODES = Object.freeze(['immutable', 'discover']);
const RETRYABLE_FAILURE_KINDS = Object.freeze(['timeout', 'rate-limited', 'unavailable']);
const POLICY_FIELDS = Object.freeze([
  'schemaVersion', 'providerId', 'revision', 'requestLimits', 'deadlineMs', 'retry',
]);

function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failProviderPolicy('INVALID_PROVIDER_POLICY', `${label} must be an object.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      failProviderPolicy('MISSING_PROVIDER_POLICY_FIELD', `${label}.${field} is required.`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) {
      failProviderPolicy('UNKNOWN_PROVIDER_POLICY_FIELD', `${label}.${field} is not allowed.`);
    }
  }
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    failProviderPolicy('INVALID_PROVIDER_POLICY_LIMIT', `${field} must be a positive safe integer.`);
  }
  return value;
}

function providerId(value) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    failProviderPolicy('INVALID_PROVIDER_POLICY_ID', 'providerId must be a namespaced capability id.');
  }
  return value;
}

function normalizeRevision(value) {
  exactRecord(value, ['mode', 'maxAgeMs'], 'revision');
  if (!REVISION_MODES.includes(value.mode)) {
    failProviderPolicy('INVALID_REVISION_POLICY', 'revision.mode is unsupported.');
  }
  if (value.mode === 'immutable' && value.maxAgeMs !== null) {
    failProviderPolicy('INVALID_REVISION_POLICY', 'immutable revisions require maxAgeMs null.');
  }
  if (value.mode === 'discover') positiveInteger(value.maxAgeMs, 'revision.maxAgeMs');
  return Object.freeze({ mode: value.mode, maxAgeMs: value.maxAgeMs });
}

function normalizeRequestLimits(value) {
  exactRecord(value, ['maxBarsPerRequest', 'maxWindowDurationMs', 'maxConcurrentRequests'], 'requestLimits');
  return Object.freeze({
    maxBarsPerRequest: positiveInteger(value.maxBarsPerRequest, 'requestLimits.maxBarsPerRequest'),
    maxWindowDurationMs: positiveInteger(value.maxWindowDurationMs, 'requestLimits.maxWindowDurationMs'),
    maxConcurrentRequests: positiveInteger(value.maxConcurrentRequests, 'requestLimits.maxConcurrentRequests'),
  });
}

function normalizeRetry(value, deadlineMs) {
  exactRecord(value, ['maxAttempts', 'backoffMs', 'retryableFailureKinds'], 'retry');
  const maxAttempts = positiveInteger(value.maxAttempts, 'retry.maxAttempts');
  if (maxAttempts > 4) {
    failProviderPolicy('UNBOUNDED_RETRY_POLICY', 'retry.maxAttempts cannot exceed four.');
  }
  if (!Array.isArray(value.backoffMs) || value.backoffMs.length !== maxAttempts - 1
    || value.backoffMs.some((delay) => !Number.isSafeInteger(delay) || delay < 0 || delay > deadlineMs)) {
    failProviderPolicy('INVALID_RETRY_POLICY', 'retry.backoffMs must define one non-negative delay per retry.');
  }
  if (!Array.isArray(value.retryableFailureKinds)
    || value.retryableFailureKinds.some((kind) => !RETRYABLE_FAILURE_KINDS.includes(kind))
    || new Set(value.retryableFailureKinds).size !== value.retryableFailureKinds.length) {
    failProviderPolicy('INVALID_RETRY_POLICY', 'retryableFailureKinds must be unique supported kinds.');
  }
  return Object.freeze({
    maxAttempts,
    backoffMs: Object.freeze([...value.backoffMs]),
    retryableFailureKinds: Object.freeze([...value.retryableFailureKinds]),
  });
}

/**
 * Owner: Provider Policy Contract.
 * Purpose: define bounded operational rules independently of any concrete data
 * source, transport, Session, Replay, chart, or cache implementation.
 * Inputs: provider id, revision freshness, request bounds, deadline, and retry.
 * Outputs: deeply immutable version-one policy.
 * Side effects: none.
 */
export function defineProviderPolicy(value) {
  exactRecord(value, POLICY_FIELDS, 'policy');
  if (value.schemaVersion !== 1) {
    failProviderPolicy('UNSUPPORTED_PROVIDER_POLICY_VERSION', 'Provider policy requires schemaVersion 1.');
  }
  const deadlineMs = positiveInteger(value.deadlineMs, 'deadlineMs');
  return Object.freeze({
    schemaVersion: 1,
    providerId: providerId(value.providerId),
    revision: normalizeRevision(value.revision),
    requestLimits: normalizeRequestLimits(value.requestLimits),
    deadlineMs,
    retry: normalizeRetry(value.retry, deadlineMs),
  });
}
