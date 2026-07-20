import { failProviderPolicy } from './policy-error.js';
import { defineProviderPolicy } from './policy-contract.js';

const FAILURE_KINDS = Object.freeze([
  'timeout', 'rate-limited', 'unavailable', 'authorization', 'unsupported',
  'invalid-request', 'revision-mismatch', 'invalid-response',
]);

/** Normalize a provider failure without leaking transport-specific errors. */
export function createProviderFailure(value) {
  const fields = ['kind', 'message', 'retryAfterMs'];
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || fields.some((field) => !Object.hasOwn(value, field))
    || Object.keys(value).some((field) => !fields.includes(field))) {
    failProviderPolicy('INVALID_PROVIDER_FAILURE', 'Provider failure fields are invalid.');
  }
  if (!FAILURE_KINDS.includes(value.kind) || typeof value.message !== 'string' || value.message.length === 0) {
    failProviderPolicy('INVALID_PROVIDER_FAILURE', 'Provider failure kind/message is invalid.');
  }
  if (value.retryAfterMs !== null
    && (!Number.isSafeInteger(value.retryAfterMs) || value.retryAfterMs < 0)) {
    failProviderPolicy('INVALID_PROVIDER_FAILURE', 'retryAfterMs must be null or non-negative.');
  }
  return Object.freeze({ kind: value.kind, message: value.message, retryAfterMs: value.retryAfterMs });
}

/** Decide retry eligibility; completedAttempts includes the failed attempt. */
export function providerRetryDelay(value, failureValue, completedAttempts) {
  const policy = defineProviderPolicy(value);
  const failure = createProviderFailure(failureValue);
  if (!Number.isSafeInteger(completedAttempts) || completedAttempts <= 0) {
    failProviderPolicy('INVALID_RETRY_ATTEMPT', 'completedAttempts must be a positive safe integer.');
  }
  if (completedAttempts >= policy.retry.maxAttempts
    || !policy.retry.retryableFailureKinds.includes(failure.kind)) return null;
  if (failure.retryAfterMs !== null && failure.retryAfterMs > policy.deadlineMs) return null;
  return failure.retryAfterMs ?? policy.retry.backoffMs[completedAttempts - 1];
}
