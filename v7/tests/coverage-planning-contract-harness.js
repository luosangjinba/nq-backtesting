import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as api from '../src/coverage-planning-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/coverage-planning-contract/negative/cases.json'), 'utf8',
));

const request = {
  schemaVersion: 1, providerId: 'test.fake-provider', instrumentId: 'cme.nq',
  sourceResolutionId: 'fixed.1-minute', windowStartEpochMs: 0,
  windowEndEpochMs: 600_000, datasetRevision: 'r1',
};
const policy = {
  schemaVersion: 1, providerId: 'test.fake-provider',
  revision: { mode: 'discover', maxAgeMs: 60_000 },
  requestLimits: { maxBarsPerRequest: 2, maxWindowDurationMs: 180_000, maxConcurrentRequests: 2 },
  deadlineMs: 3_000,
  retry: { maxAttempts: 2, backoffMs: [0], retryableFailureKinds: ['unavailable'] },
};
const segments = [
  { startEpochMs: 0, endEpochMs: 60_000, kind: 'data' },
  { startEpochMs: 60_000, endEpochMs: 120_000, kind: 'data' },
  { startEpochMs: 120_000, endEpochMs: 240_000, kind: 'market-closed' },
  { startEpochMs: 240_000, endEpochMs: 540_000, kind: 'unknown' },
  { startEpochMs: 540_000, endEpochMs: 600_000, kind: 'source-unavailable' },
];

const coverage = api.createCoverageReport({ schemaVersion: 1, request, segments });
assert.equal(Object.isFrozen(coverage.segments), true);
assert.deepEqual(coverage.segments[0], { startEpochMs: 0, endEpochMs: 120_000, kind: 'data' },
  'adjacent equal coverage must canonicalize into one segment');
assert.equal(api.createCoverageReport(coverage).requestKey, coverage.requestKey,
  'normalized coverage must remain valid across trust boundaries');

const forward = api.planCoverageRequests({ request, coverage, policy, sourceStepMs: 60_000 });
assert.deepEqual(forward.map((item) => [item.windowStartEpochMs, item.windowEndEpochMs]), [
  [240_000, 360_000], [360_000, 480_000], [480_000, 540_000],
]);
assert.equal(forward.every((item) => item.datasetRevision === 'r1'), true);
const retry = api.planCoverageRequests({
  request, coverage, policy, sourceStepMs: 60_000, retryUnavailable: true, direction: 'backward',
});
assert.deepEqual(retry.map((item) => [item.windowStartEpochMs, item.windowEndEpochMs]), [
  [540_000, 600_000], [480_000, 540_000], [360_000, 480_000], [240_000, 360_000],
]);
assert.equal(api.planCoverageRequests({
  request, coverage: api.createCoverageReport({
    schemaVersion: 1, request,
    segments: [{ startEpochMs: 0, endEpochMs: 600_000, kind: 'market-closed' }],
  }), policy, sourceStepMs: 60_000,
}).length, 0, 'settled non-data intervals must not be requested');

const actions = {
  'empty-segments': () => api.createCoverageReport({ schemaVersion: 1, request, segments: [] }),
  'coverage-hole': () => api.createCoverageReport({ schemaVersion: 1, request, segments: [segments[0], segments[2], ...segments.slice(3)] }),
  'coverage-overlap': () => api.createCoverageReport({ schemaVersion: 1, request, segments: [
    { startEpochMs: 0, endEpochMs: 300_000, kind: 'data' },
    { startEpochMs: 240_000, endEpochMs: 600_000, kind: 'unknown' },
  ] }),
  'invalid-coverage-kind': () => api.createCoverageReport({ schemaVersion: 1, request, segments: [
    { startEpochMs: 0, endEpochMs: 600_000, kind: 'weekend' },
  ] }),
  'forged-request-key': () => api.createCoverageReport({ schemaVersion: 1, request, requestKey: 'forged', segments }),
  'zero-source-step': () => api.planCoverageRequests({ request, coverage, policy, sourceStepMs: 0 }),
  'invalid-direction': () => api.planCoverageRequests({ request, coverage, policy, sourceStepMs: 60_000, direction: 'center' }),
  'coverage-request-mismatch': () => api.planCoverageRequests({
    request: { ...request, datasetRevision: 'r2' }, coverage, policy, sourceStepMs: 60_000,
  }),
  'policy-provider-mismatch': () => api.planCoverageRequests({
    request, coverage, policy: { ...policy, providerId: 'other.fake-provider' }, sourceStepMs: 60_000,
  }),
  'unknown-segment-field': () => api.createCoverageReport({ schemaVersion: 1, request, segments: [
    { startEpochMs: 0, endEpochMs: 600_000, kind: 'data', bars: [] },
  ] }),
};

for (const fixture of negativeCases) {
  assert.throws(
    actions[fixture.case],
    (error) => error instanceof api.CoveragePlanningError && error.code === fixture.expectedCode,
    fixture.case,
  );
}

console.log(`v7 Coverage Planning contract harness passed (${negativeCases.length} negative controls)`);
