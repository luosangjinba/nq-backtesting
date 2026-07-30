import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createRawBarBatch } from '../src/bar-data-contract/public.js';
import {
  RawCoverageLeaseContractError,
  createRawCoverageLease,
  createRawCoverageLeasePolicy,
  createRawCoverageLeaseScope,
} from '../src/raw-coverage-lease-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/raw-coverage-lease-contract/negative/cases.json',
), 'utf8'));

function identity(transaction = 'tx-lease') {
  return createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(1),
    sessionId: createSessionId('session-lease'),
    transactionId: createTransactionId(transaction),
  });
}

function request(start, end, overrides = {}) {
  return {
    datasetRevision: 'dataset-r1',
    instrumentId: 'instrument.cme.nq',
    providerId: 'provider.local.v4',
    schemaVersion: 1,
    sourceResolutionId: 'resolution.fixed.1m',
    windowEndEpochMs: end,
    windowStartEpochMs: start,
    ...overrides,
  };
}

function batch(rawRequest, close = 101) {
  return createRawBarBatch({
    bars: [{
      close,
      high: close + 1,
      low: close - 2,
      open: close - 1,
      startEpochMs: rawRequest.windowStartEpochMs,
      volume: 42,
    }],
    request: rawRequest,
    schemaVersion: 1,
  });
}

const currentIdentity = identity();
const alternateIdentity = identity('tx-alternate');
const windows = Object.freeze([request(1_000, 2_000), request(2_000, 3_000)]);
const policy = createRawCoverageLeasePolicy({
  maxTotalWindowSpanMs: 2_000,
  maxWindowCount: 2,
  maxWindowSpanMs: 1_000,
  schemaVersion: 1,
});
const scope = createRawCoverageLeaseScope({
  identity: currentIdentity,
  policy,
  requests: windows,
  schemaVersion: 1,
});
assert.equal(Object.isFrozen(policy), true);
assert.equal(Object.isFrozen(scope), true);
assert.equal(Object.isFrozen(scope.requests), true);
assert.equal(Object.isFrozen(scope.requestKeys), true);
assert.equal(createRawCoverageLeasePolicy(policy), policy);
assert.equal(createRawCoverageLeaseScope(scope), scope);

let ownerReadCount = 0;
const lease = createRawCoverageLease({
  readWindow(rawRequest, { signal }) {
    ownerReadCount += 1;
    assert.equal(signal, lease.signal);
    return batch(rawRequest);
  },
  scope,
});
assert.equal(Object.isFrozen(lease), true);
assert.equal(Object.hasOwn(lease, 'batches'), false, 'lease must not expose retained raw batches');
assert.equal(Object.hasOwn(lease, 'readWindow'), false, 'owner cache reader must stay private');
assert.deepEqual(lease.snapshot(), {
  cancellationCode: null,
  identity: currentIdentity,
  requestKeys: scope.requestKeys,
  schemaVersion: 1,
  status: 'active',
});
const derived = lease.withReadView({
  identity: currentIdentity,
  request: windows[0],
  visit(rawBatch) {
    return Object.freeze({ barCount: rawBatch.bars.length, close: rawBatch.bars[0].close });
  },
});
assert.deepEqual(derived, { barCount: 1, close: 101 });
assert.equal(ownerReadCount, 1);

const cancelled = lease.cancel({ code: 'superseded-transaction' });
assert.equal(cancelled.status, 'cancelled');
assert.equal(cancelled.cancellationCode, 'superseded-transaction');
assert.equal(lease.signal.aborted, true);
assert.deepEqual(lease.signal.reason, {
  code: 'superseded-transaction',
  kind: 'raw-coverage-lease-cancelled',
});
assert.deepEqual(lease.cancel({ code: 'ignored-after-first-cancel' }), cancelled);
const disposedAfterCancel = lease.dispose();
assert.equal(disposedAfterCancel.status, 'disposed');
assert.deepEqual(lease.dispose(), disposedAfterCancel, 'disposal must be idempotent');

const disposedActive = createRawCoverageLease({ readWindow: (rawRequest) => batch(rawRequest), scope });
disposedActive.dispose();
assert.equal(disposedActive.signal.aborted, true);
assert.deepEqual(disposedActive.signal.reason, {
  code: 'lease-disposed',
  kind: 'raw-coverage-lease-disposed',
});

function freshLease(readWindow = (rawRequest) => batch(rawRequest)) {
  return createRawCoverageLease({ readWindow, scope });
}

function readInput(overrides = {}) {
  return {
    identity: currentIdentity,
    request: windows[0],
    visit: () => undefined,
    ...overrides,
  };
}

const cancelledLease = freshLease();
cancelledLease.cancel({ code: 'superseded' });
const disposedLease = freshLease();
disposedLease.dispose();
let deniedOwnerReadCount = 0;
const accessGuardLease = freshLease((rawRequest) => {
  deniedOwnerReadCount += 1;
  return batch(rawRequest);
});
const negativeActions = {
  'unsupported-policy-version': () => createRawCoverageLeasePolicy({
    maxTotalWindowSpanMs: 2, maxWindowCount: 1, maxWindowSpanMs: 1, schemaVersion: 2,
  }),
  'unknown-policy-field': () => createRawCoverageLeasePolicy({
    maxTotalWindowSpanMs: 2, maxWindowCount: 1, maxWindowSpanMs: 1, schemaVersion: 1, cache: true,
  }),
  'zero-window-count': () => createRawCoverageLeasePolicy({
    maxTotalWindowSpanMs: 2, maxWindowCount: 0, maxWindowSpanMs: 1, schemaVersion: 1,
  }),
  'total-smaller-than-window': () => createRawCoverageLeasePolicy({
    maxTotalWindowSpanMs: 1, maxWindowCount: 1, maxWindowSpanMs: 2, schemaVersion: 1,
  }),
  'unsupported-scope-version': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy, requests: windows, schemaVersion: 2,
  }),
  'raw-transaction-identity': () => createRawCoverageLeaseScope({
    identity: {}, policy, requests: windows, schemaVersion: 1,
  }),
  'empty-request-windows': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy, requests: [], schemaVersion: 1,
  }),
  'window-count-exceeded': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy, requests: [...windows, request(3_000, 4_000)], schemaVersion: 1,
  }),
  'mixed-source-scope': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy,
    requests: [windows[0], request(2_000, 3_000, { instrumentId: 'instrument.cme.es' })],
    schemaVersion: 1,
  }),
  'overlapping-windows': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy, requests: [windows[0], request(1_999, 2_500)], schemaVersion: 1,
  }),
  'window-span-exceeded': () => createRawCoverageLeaseScope({
    identity: currentIdentity, policy, requests: [request(1_000, 2_001)], schemaVersion: 1,
  }),
  'total-span-exceeded': () => createRawCoverageLeaseScope({
    identity: currentIdentity,
    policy: createRawCoverageLeasePolicy({
      maxTotalWindowSpanMs: 1_500, maxWindowCount: 2, maxWindowSpanMs: 1_000, schemaVersion: 1,
    }),
    requests: windows,
    schemaVersion: 1,
  }),
  'forged-scope': () => createRawCoverageLease({ readWindow() {}, scope: { ...scope } }),
  'missing-read-port': () => createRawCoverageLease({ readWindow: null, scope }),
  'stale-read-identity': () => accessGuardLease.withReadView(readInput({ identity: alternateIdentity })),
  'unleased-read-window': () => accessGuardLease.withReadView(readInput({ request: request(4_000, 5_000) })),
  'async-read-port': () => freshLease(async (rawRequest) => batch(rawRequest)).withReadView(readInput()),
  'mismatched-read-batch': () => freshLease(() => batch(windows[1])).withReadView(readInput()),
  'async-visitor': () => freshLease().withReadView(readInput({ visit: async () => undefined })),
  'raw-batch-escape': () => freshLease().withReadView(readInput({ visit: (rawBatch) => rawBatch })),
  'raw-bars-escape': () => freshLease().withReadView(readInput({ visit: (rawBatch) => rawBatch.bars })),
  'invalid-cancel-code': () => freshLease().cancel({ code: 'User Cancelled' }),
  'read-after-cancel': () => cancelledLease.withReadView(readInput()),
  'read-after-dispose': () => disposedLease.withReadView(readInput()),
};

for (const fixture of negativeCases) {
  assert.throws(
    negativeActions[fixture.case],
    (error) => error?.code === fixture.expectedCode,
    `${fixture.case} must fail with ${fixture.expectedCode}`,
  );
}
assert.equal(
  deniedOwnerReadCount,
  0,
  'stale identity and unleased windows must be rejected before the owner cache is read',
);
accessGuardLease.dispose();
assert.throws(
  () => createRawCoverageLeasePolicy({ ...policy, maxWindowCount: Number.MAX_SAFE_INTEGER + 1 }),
  (error) => error instanceof RawCoverageLeaseContractError
    && error.code === 'RAW_COVERAGE_POLICY_INVALID',
);

console.log(`v7 Raw Coverage Lease contract harness passed (${negativeCases.length + 1} negative controls)`);
