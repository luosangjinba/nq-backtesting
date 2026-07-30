import { createRawBarRequest, rawBarRequestKey } from '../bar-data-contract/public.js';
import { requireWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { failRawCoverageLeaseContract } from './contract-error.js';

const POLICY_BRAND = Symbol('RawCoverageLeasePolicy');
const SCOPE_BRAND = Symbol('RawCoverageLeaseScope');
const POLICY_FIELDS = Object.freeze([
  'schemaVersion', 'maxWindowCount', 'maxWindowSpanMs', 'maxTotalWindowSpanMs',
]);
const SCOPE_FIELDS = Object.freeze(['schemaVersion', 'identity', 'requests', 'policy']);

function requireExactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failRawCoverageLeaseContract(code, `${label} must be an object.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) {
      failRawCoverageLeaseContract(code, `${label} is missing ${field}.`);
    }
  }
  if (Object.keys(value).some((field) => !fields.includes(field))) {
    failRawCoverageLeaseContract(code, `${label} contains an unknown field.`);
  }
}

function requirePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_POLICY_INVALID',
      `${field} must be a positive safe integer.`,
    );
  }
  return value;
}

function sourceScope(request) {
  return JSON.stringify([
    request.providerId,
    request.instrumentId,
    request.sourceResolutionId,
    request.datasetRevision,
  ]);
}

/**
 * Owner: Bar Data Runtime contract boundary.
 * Inputs/outputs: validates finite window-count, per-window, and aggregate-span
 * limits and returns one immutable versioned policy.
 * Side effects/lifecycle: none.
 * Errors: RawCoverageLeaseContractError for malformed or impossible limits.
 */
export function createRawCoverageLeasePolicy(value) {
  if (value?.[POLICY_BRAND] === true) return value;
  requireExactRecord(value, POLICY_FIELDS, 'RAW_COVERAGE_POLICY_INVALID', 'Policy');
  if (value.schemaVersion !== 1) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_POLICY_VERSION_UNSUPPORTED',
      'Raw Coverage Lease policy requires schemaVersion 1.',
    );
  }
  const maxWindowSpanMs = requirePositiveInteger(value.maxWindowSpanMs, 'maxWindowSpanMs');
  const maxTotalWindowSpanMs = requirePositiveInteger(
    value.maxTotalWindowSpanMs,
    'maxTotalWindowSpanMs',
  );
  if (maxTotalWindowSpanMs < maxWindowSpanMs) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_POLICY_INVALID',
      'Aggregate span limit must not be smaller than the per-window limit.',
    );
  }
  const policy = {
    maxTotalWindowSpanMs,
    maxWindowCount: requirePositiveInteger(value.maxWindowCount, 'maxWindowCount'),
    maxWindowSpanMs,
    schemaVersion: 1,
  };
  Object.defineProperty(policy, POLICY_BRAND, { value: true });
  return Object.freeze(policy);
}

/** Validate and return a branded Raw Coverage Lease scope. */
export function requireRawCoverageLeaseScope(value) {
  if (value?.[SCOPE_BRAND] !== true) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_SCOPE_REQUIRED',
      'A branded Raw Coverage Lease scope is required.',
    );
  }
  requireWorkspaceTransactionIdentity(value.identity);
  return value;
}

/**
 * Owner: Bar Data Runtime contract boundary.
 * Inputs: complete branded Workspace transaction identity, one or more raw-bar
 * requests, and explicit finite policy.
 * Outputs: immutable transaction-scoped coverage description and request keys.
 * Side effects/lifecycle: none; the scope owns no provider, cache, or raw batch.
 * Errors: rejects unbounded, mixed-source, overlapping, or unordered windows.
 * Protected invariant: a consumer can receive only a bounded view of one exact
 * provider/instrument/resolution/dataset scope for one complete transaction.
 */
export function createRawCoverageLeaseScope(value) {
  if (value?.[SCOPE_BRAND] === true) return value;
  requireExactRecord(value, SCOPE_FIELDS, 'RAW_COVERAGE_SCOPE_INVALID', 'Scope');
  if (value.schemaVersion !== 1) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_SCOPE_VERSION_UNSUPPORTED',
      'Raw Coverage Lease scope requires schemaVersion 1.',
    );
  }
  const identity = requireWorkspaceTransactionIdentity(value.identity);
  const policy = createRawCoverageLeasePolicy(value.policy);
  if (!Array.isArray(value.requests) || value.requests.length === 0) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_SCOPE_INVALID',
      'Raw Coverage Lease scope requires at least one request window.',
    );
  }
  if (value.requests.length > policy.maxWindowCount) {
    failRawCoverageLeaseContract(
      'RAW_COVERAGE_WINDOW_COUNT_EXCEEDED',
      'Raw Coverage Lease exceeds its maximum window count.',
    );
  }

  const requests = value.requests.map(createRawBarRequest);
  const expectedSourceScope = sourceScope(requests[0]);
  let previousEndEpochMs = null;
  let totalWindowSpanMs = 0;
  for (const request of requests) {
    if (sourceScope(request) !== expectedSourceScope) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_SOURCE_SCOPE_MISMATCH',
        'Every leased window must share one raw source scope.',
      );
    }
    if (previousEndEpochMs !== null && request.windowStartEpochMs < previousEndEpochMs) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_WINDOWS_NOT_ORDERED',
        'Leased windows must be ordered and non-overlapping.',
      );
    }
    const windowSpanMs = request.windowEndEpochMs - request.windowStartEpochMs;
    if (windowSpanMs > policy.maxWindowSpanMs) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_WINDOW_SPAN_EXCEEDED',
        'A leased window exceeds the per-window span limit.',
      );
    }
    totalWindowSpanMs += windowSpanMs;
    if (!Number.isSafeInteger(totalWindowSpanMs)
      || totalWindowSpanMs > policy.maxTotalWindowSpanMs) {
      failRawCoverageLeaseContract(
        'RAW_COVERAGE_TOTAL_SPAN_EXCEEDED',
        'Raw Coverage Lease exceeds its aggregate span limit.',
      );
    }
    previousEndEpochMs = request.windowEndEpochMs;
  }

  const scope = {
    identity,
    policy,
    requestKeys: Object.freeze(requests.map(rawBarRequestKey)),
    requests: Object.freeze(requests),
    schemaVersion: 1,
  };
  Object.defineProperty(scope, SCOPE_BRAND, { value: true });
  return Object.freeze(scope);
}
