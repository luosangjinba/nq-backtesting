import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as api from '../src/provider-policy-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/provider-policy-contract/negative/cases.json'), 'utf8',
));

function policy(overrides = {}) {
  return {
    schemaVersion: 1,
    providerId: 'test.fake-provider',
    revision: { mode: 'discover', maxAgeMs: 60_000 },
    requestLimits: { maxBarsPerRequest: 10_000, maxWindowDurationMs: 86_400_000, maxConcurrentRequests: 3 },
    deadlineMs: 3_000,
    retry: { maxAttempts: 3, backoffMs: [0, 25], retryableFailureKinds: ['timeout', 'rate-limited'] },
    ...overrides,
  };
}

const normalized = api.defineProviderPolicy(policy());
assert.equal(Object.isFrozen(normalized), true);
assert.equal(Object.isFrozen(normalized.retry.backoffMs), true);
assert.equal(normalized.deadlineMs, 3_000, 'deadline is a failure bound, not an artificial delay');
assert.equal(api.requireProviderAdapter({
  providerId: 'test.fake-provider',
  resolveDatasetRevision() {},
  requestRawBars() {},
}, normalized).providerId, normalized.providerId);

const timeout = api.createProviderFailure({ kind: 'timeout', message: 'late', retryAfterMs: null });
assert.equal(api.providerRetryDelay(normalized, timeout, 1), 0);
assert.equal(api.providerRetryDelay(normalized, timeout, 2), 25);
assert.equal(api.providerRetryDelay(normalized, timeout, 3), null, 'retry attempts must be bounded');
assert.equal(api.providerRetryDelay(normalized, {
  kind: 'authorization', message: 'denied', retryAfterMs: null,
}, 1), null, 'terminal failures must never retry');
assert.equal(api.providerRetryDelay(normalized, {
  kind: 'rate-limited', message: 'slow down', retryAfterMs: 75,
}, 1), 75, 'provider retry-after takes precedence over static backoff');
assert.equal(api.providerRetryDelay(normalized, {
  kind: 'rate-limited', message: 'try much later', retryAfterMs: 3_001,
}, 1), null, 'retry-after beyond the declared deadline must not extend foreground waiting');

const actions = {
  'unknown-policy-field': () => api.defineProviderPolicy(policy({ sessionId: 'leak' })),
  'invalid-provider-id': () => api.defineProviderPolicy(policy({ providerId: 'NQ' })),
  'invalid-revision-mode': () => api.defineProviderPolicy(policy({ revision: { mode: 'latest', maxAgeMs: 1 } })),
  'immutable-revision-ttl': () => api.defineProviderPolicy(policy({ revision: { mode: 'immutable', maxAgeMs: 1 } })),
  'zero-request-limit': () => api.defineProviderPolicy(policy({ requestLimits: { maxBarsPerRequest: 0, maxWindowDurationMs: 1, maxConcurrentRequests: 1 } })),
  'unbounded-retry': () => api.defineProviderPolicy(policy({ retry: { maxAttempts: 5, backoffMs: [0, 0, 0, 0], retryableFailureKinds: [] } })),
  'retry-delay-count-mismatch': () => api.defineProviderPolicy(policy({ retry: { maxAttempts: 3, backoffMs: [0], retryableFailureKinds: [] } })),
  'retry-delay-exceeds-deadline': () => api.defineProviderPolicy(policy({ retry: { maxAttempts: 2, backoffMs: [3_001], retryableFailureKinds: [] } })),
  'terminal-kind-in-retry-list': () => api.defineProviderPolicy(policy({ retry: { maxAttempts: 1, backoffMs: [], retryableFailureKinds: ['authorization'] } })),
  'adapter-provider-mismatch': () => api.requireProviderAdapter({
    providerId: 'other.fake-provider', resolveDatasetRevision() {}, requestRawBars() {},
  }, policy()),
  'invalid-failure-kind': () => api.createProviderFailure({ kind: 'network', message: 'x', retryAfterMs: null }),
  'invalid-completed-attempts': () => api.providerRetryDelay(policy(), timeout, 0),
};

for (const fixture of negativeCases) {
  assert.throws(
    actions[fixture.case],
    (error) => error instanceof api.ProviderPolicyError && error.code === fixture.expectedCode,
    fixture.case,
  );
}

console.log(`v7 Provider Policy contract harness passed (${negativeCases.length} negative controls)`);
