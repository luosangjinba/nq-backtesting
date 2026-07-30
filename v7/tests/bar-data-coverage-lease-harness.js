import assert from 'node:assert/strict';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createRawBarBatch } from '../src/bar-data-contract/public.js';
import { createBarDataRuntime, BarDataRuntimeError } from '../src/bar-data-runtime/public.js';
import { RawCoverageLeaseContractError } from '../src/raw-coverage-lease-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

function identity(index) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(1),
    sessionId: createSessionId('session-coverage'),
    transactionId: createTransactionId(`tx-coverage-${index}`),
  });
}

function request(start, end) {
  return Object.freeze({
    datasetRevision: 'dataset-r1',
    instrumentId: 'instrument.cme.nq',
    providerId: 'provider.test.raw',
    schemaVersion: 1,
    sourceResolutionId: 'resolution.fixed.1m',
    windowEndEpochMs: end,
    windowStartEpochMs: start,
  });
}

function batch(rawRequest) {
  return createRawBarBatch({
    bars: [{
      close: 101,
      high: 102,
      low: 99,
      open: 100,
      startEpochMs: rawRequest.windowStartEpochMs,
      volume: 42,
    }],
    request: rawRequest,
    schemaVersion: 1,
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function runtime(provider, overrides = {}) {
  return createBarDataRuntime({
    maxCacheEntries: 1,
    maxConcurrentRequests: 1,
    maxCoverageConsumers: 2,
    maxCoverageTotalWindowSpanMs: 10_000,
    maxCoverageWindowCount: 4,
    maxCoverageWindowSpanMs: 5_000,
    resolveProvider: () => provider,
    ...overrides,
  });
}

let providerCalls = 0;
const owner = runtime({
  requestRawBars(rawRequest) {
    providerCalls += 1;
    return batch(rawRequest);
  },
});
const firstRequest = request(5_000, 7_000);
const firstIdentity = identity(1);
const firstLease = await owner.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: firstIdentity,
  operation: 'source-replacement',
  request: firstRequest,
  signal: new AbortController().signal,
});
assert.equal(Object.hasOwn(firstLease, 'batches'), false);
assert.deepEqual(firstLease.withReadView({
  identity: firstIdentity,
  request: firstRequest,
  visit: (rawBatch) => Object.freeze({ barCount: rawBatch.bars.length }),
}), { barCount: 1 });
owner.commitCoverageLeases({ activeConsumerIds: ['pane-main'], leases: [firstLease] });
assert.equal(owner.oldestCoverageEpochMs('pane-main'), 5_000);

await owner.acquire(request(8_000, 9_000));
assert.equal(providerCalls, 2, 'a second exact request evicts the first LRU entry');
const reusedIdentity = identity(2);
const reusedLease = await owner.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: reusedIdentity,
  operation: 'navigation',
  request: request(5_500, 6_500),
  signal: new AbortController().signal,
});
assert.equal(providerCalls, 2,
  'accepted owner coverage must satisfy a contained request after exact-LRU eviction');
assert.deepEqual(reusedLease.requests, [firstRequest],
  'covered navigation retains the wider accepted source wall');
owner.commitCoverageLeases({ activeConsumerIds: ['pane-main'], leases: [reusedLease] });

const historyIdentity = identity(3);
const historyRequest = request(3_000, 5_000);
const historyLease = await owner.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: historyIdentity,
  operation: 'history-extension',
  request: historyRequest,
  signal: new AbortController().signal,
});
assert.deepEqual(historyLease.requests, [historyRequest, firstRequest]);
owner.commitCoverageLeases({ activeConsumerIds: ['pane-main'], leases: [historyLease] });
assert.equal(owner.oldestCoverageEpochMs('pane-main'), 3_000);

const rejectedIdentity = identity(4);
const rejectedLease = await owner.acquireCoverageLease({
  consumerId: 'pane-secondary',
  identity: rejectedIdentity,
  operation: 'source-replacement',
  request: request(1_000, 2_000),
  signal: new AbortController().signal,
});
owner.rejectCoverageLeases([rejectedLease]);
assert.throws(() => rejectedLease.withReadView({
  identity: rejectedIdentity,
  request: rejectedLease.requests[0],
  visit: () => null,
}), (error) => error instanceof RawCoverageLeaseContractError
  && error.code === 'RAW_COVERAGE_LEASE_INACTIVE');

owner.commitCoverageLeases({ activeConsumerIds: [], leases: [] });
assert.equal(owner.oldestCoverageEpochMs('pane-main'), null,
  'inactive consumers release their accepted coverage');
owner.dispose();

const gate = deferred();
let delayedCalls = 0;
const delayed = runtime({
  requestRawBars(rawRequest) {
    delayedCalls += 1;
    return gate.promise.then(() => batch(rawRequest));
  },
});
const delayedController = new AbortController();
const delayedRequest = request(10_000, 11_000);
const delayedAcquisition = delayed.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: identity(5),
  operation: 'source-replacement',
  request: delayedRequest,
  signal: delayedController.signal,
});
await flush();
delayedController.abort();
await assert.rejects(delayedAcquisition, (error) => error instanceof BarDataRuntimeError
  && error.code === 'RAW_COVERAGE_LEASE_CANCELLED');
gate.resolve();
await flush();
const recoveredIdentity = identity(6);
const recovered = await delayed.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: recoveredIdentity,
  operation: 'source-replacement',
  request: delayedRequest,
  signal: new AbortController().signal,
});
assert.equal(delayedCalls, 1,
  'cancelled consumer work may finish only into the owner cache and is reusable safely');
delayed.commitCoverageLeases({ activeConsumerIds: ['pane-main'], leases: [recovered] });
delayed.dispose();

const disposable = runtime({ requestRawBars: (rawRequest) => batch(rawRequest) });
const liveIdentity = identity(7);
const live = await disposable.acquireCoverageLease({
  consumerId: 'pane-main',
  identity: liveIdentity,
  operation: 'source-replacement',
  request: request(20_000, 21_000),
  signal: new AbortController().signal,
});
disposable.dispose();
assert.equal(live.signal.aborted, true);
assert.throws(() => live.withReadView({
  identity: liveIdentity,
  request: live.requests[0],
  visit: () => null,
}), (error) => error instanceof RawCoverageLeaseContractError
  && error.code === 'RAW_COVERAGE_LEASE_INACTIVE');

const bounded = runtime(
  { requestRawBars: (rawRequest) => batch(rawRequest) },
  { maxCoverageWindowCount: 1 },
);
const boundedFirst = await bounded.acquireCoverageLease({
  consumerId: 'pane-main', identity: identity(8), operation: 'source-replacement',
  request: request(30_000, 31_000), signal: new AbortController().signal,
});
bounded.commitCoverageLeases({ activeConsumerIds: ['pane-main'], leases: [boundedFirst] });
await assert.rejects(bounded.acquireCoverageLease({
  consumerId: 'pane-main', identity: identity(9), operation: 'history-extension',
  request: request(29_000, 30_000), signal: new AbortController().signal,
}), (error) => error instanceof BarDataRuntimeError
  && error.code === 'RAW_COVERAGE_WINDOW_COUNT_EXCEEDED');
bounded.dispose();

console.log('v7 Bar Data coverage lease harness passed', {
  scope: 'bounded owner coverage, LRU reuse, delay cancellation, release, disposal',
});
