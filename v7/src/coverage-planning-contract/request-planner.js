import { createRawBarRequest, rawBarRequestKey } from '../bar-data-contract/public.js';
import { defineProviderPolicy } from '../provider-policy-contract/public.js';
import { createCoverageReport } from './coverage-report.js';
import { failCoveragePlanning } from './coverage-error.js';

function positiveStep(value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    failCoveragePlanning('INVALID_SOURCE_STEP', 'sourceStepMs must be a positive safe integer.');
  }
  return value;
}

function boundedSpan(policy, sourceStepMs) {
  const barSpan = policy.requestLimits.maxBarsPerRequest
    > Math.floor(Number.MAX_SAFE_INTEGER / sourceStepMs)
    ? Number.MAX_SAFE_INTEGER
    : policy.requestLimits.maxBarsPerRequest * sourceStepMs;
  return Math.min(barSpan, policy.requestLimits.maxWindowDurationMs);
}

function chunkSegment(request, segment, span) {
  const windows = [];
  let cursor = segment.startEpochMs;
  while (cursor < segment.endEpochMs) {
    const endEpochMs = cursor + Math.min(segment.endEpochMs - cursor, span);
    windows.push(createRawBarRequest({
      ...request,
      windowStartEpochMs: cursor,
      windowEndEpochMs: endEpochMs,
    }));
    cursor = endEpochMs;
  }
  return windows;
}

/**
 * Plan only unresolved windows. `source-unavailable` is retried only when the
 * caller explicitly opens a retry cycle; settled gaps are never re-requested.
 */
export function planCoverageRequests({
  request: requestValue,
  coverage: coverageValue,
  policy: policyValue,
  sourceStepMs: sourceStepValue,
  retryUnavailable = false,
  direction = 'forward',
}) {
  if (typeof retryUnavailable !== 'boolean' || !['forward', 'backward'].includes(direction)) {
    failCoveragePlanning('INVALID_COVERAGE_PLAN_OPTIONS', 'Coverage plan options are invalid.');
  }
  const request = createRawBarRequest(requestValue);
  const coverage = createCoverageReport(coverageValue);
  const policy = defineProviderPolicy(policyValue);
  if (coverage.requestKey !== rawBarRequestKey(request) || policy.providerId !== request.providerId) {
    failCoveragePlanning('COVERAGE_PLAN_IDENTITY_MISMATCH', 'Request, coverage, and policy identities must match.');
  }
  const span = boundedSpan(policy, positiveStep(sourceStepValue));
  const unresolvedKinds = retryUnavailable
    ? new Set(['unknown', 'source-unavailable']) : new Set(['unknown']);
  const plan = coverage.segments
    .filter((segment) => unresolvedKinds.has(segment.kind))
    .flatMap((segment) => chunkSegment(request, segment, span));
  if (direction === 'backward') plan.reverse();
  return Object.freeze(plan);
}
