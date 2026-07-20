import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRawBarBatch } from '../src/bar-data-contract/public.js';
import * as runtimeApi from '../src/bar-data-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/bar-data-runtime/negative/cases.json'), 'utf8',
));

function request(index = 0, overrides = {}) {
  const start = 1_000_000 + index * 180_000;
  return {
    schemaVersion: 1,
    providerId: 'local.fake-provider',
    instrumentId: 'cme.nq',
    sourceResolutionId: 'fixed.1-minute',
    windowStartEpochMs: start,
    windowEndEpochMs: start + 180_000,
    datasetRevision: 'fake-r1',
    ...overrides,
  };
}

function batch(rawRequest) {
  return createRawBarBatch({
    schemaVersion: 1,
    request: rawRequest,
    bars: [{
      startEpochMs: rawRequest.windowStartEpochMs,
      open: 100,
      high: 102,
      low: 99,
      close: 101,
      volume: 42,
    }],
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function runtimeFor(provider, options = {}) {
  return runtimeApi.createBarDataRuntime({
    resolveProvider: () => provider,
    maxCacheEntries: options.maxCacheEntries ?? 4,
    maxConcurrentRequests: options.maxConcurrentRequests ?? 2,
  });
}

// One exact identity has one in-flight Promise, one provider call, and then a cache hit.
let coalescedCalls = 0;
const firstResponse = deferred();
const coalescingRuntime = runtimeFor({
  requestRawBars(rawRequest) {
    coalescedCalls += 1;
    return firstResponse.promise.then(() => batch(rawRequest));
  },
});
const sharedOne = coalescingRuntime.acquire(request());
const sharedTwo = coalescingRuntime.acquire(request());
assert.equal(sharedOne, sharedTwo, 'identical in-flight requests must return the same Promise');
await flush();
assert.equal(coalescedCalls, 1);
firstResponse.resolve();
assert.equal(await sharedOne, await sharedTwo);
assert.equal(await coalescingRuntime.acquire(request()), await sharedOne);
assert.equal(coalescedCalls, 1, 'cache hit must not call the provider');
coalescingRuntime.dispose();

// Global concurrency is bounded and queued work starts automatically on settlement.
const concurrencyDeferred = [];
let concurrencyCalls = 0;
const concurrencyRuntime = runtimeFor({
  requestRawBars(rawRequest) {
    concurrencyCalls += 1;
    const gate = deferred();
    concurrencyDeferred.push({ rawRequest, gate });
    return gate.promise.then(() => batch(rawRequest));
  },
}, { maxConcurrentRequests: 2 });
const concurrentPromises = [0, 1, 2].map((index) => concurrencyRuntime.acquire(request(index)));
await flush();
assert.equal(concurrencyCalls, 2, 'third unique request must wait behind the concurrency bound');
concurrencyDeferred[0].gate.resolve();
await concurrentPromises[0];
await flush();
assert.equal(concurrencyCalls, 3, 'queued work must continue without another user input');
concurrencyDeferred[1].gate.resolve();
concurrencyDeferred[2].gate.resolve();
await Promise.all(concurrentPromises.slice(1));
concurrencyRuntime.dispose();

// Exact-window LRU eviction is bounded and runtime instances share no cache.
let evictionCalls = 0;
const immediateProvider = {
  requestRawBars(rawRequest) {
    evictionCalls += 1;
    return batch(rawRequest);
  },
};
const evictionRuntime = runtimeFor(immediateProvider, { maxCacheEntries: 2 });
await evictionRuntime.acquire(request(0));
await evictionRuntime.acquire(request(1));
await evictionRuntime.acquire(request(2));
await evictionRuntime.acquire(request(0));
assert.equal(evictionCalls, 4, 'least-recently-used exact window must be evicted');
const isolatedRuntime = runtimeFor(immediateProvider, { maxCacheEntries: 2 });
await isolatedRuntime.acquire(request(2));
assert.equal(evictionCalls, 5, 'separate runtimes must not share cache state');
evictionRuntime.dispose();
isolatedRuntime.dispose();

// Provider failures are never cached.
let retryCalls = 0;
const retryRuntime = runtimeFor({
  requestRawBars(rawRequest) {
    retryCalls += 1;
    if (retryCalls === 1) throw new Error('intentional provider failure');
    return batch(rawRequest);
  },
});
await assert.rejects(retryRuntime.acquire(request()), /intentional provider failure/);
await retryRuntime.acquire(request());
assert.equal(retryCalls, 2);
retryRuntime.dispose();

// Dispose settles active and queued consumers, signals the provider, and blocks late cache writes.
const disposalGate = deferred();
let disposalSignal;
const disposalRuntime = runtimeFor({
  requestRawBars(rawRequest, { signal }) {
    disposalSignal = signal;
    return disposalGate.promise.then(() => batch(rawRequest));
  },
}, { maxConcurrentRequests: 1 });
const activeAtDispose = disposalRuntime.acquire(request(0));
const queuedAtDispose = disposalRuntime.acquire(request(1));
await flush();
disposalRuntime.dispose();
await assert.rejects(activeAtDispose, (error) => error.code === 'BAR_DATA_RUNTIME_DISPOSED');
await assert.rejects(queuedAtDispose, (error) => error.code === 'BAR_DATA_RUNTIME_DISPOSED');
assert.equal(disposalSignal.aborted, true);
disposalGate.resolve();
await flush();

async function failureCode(action) {
  try {
    await action();
    return null;
  } catch (error) {
    assert.ok(error instanceof runtimeApi.BarDataRuntimeError);
    return error.code;
  }
}

const differentRequest = request(1);
const negativeActions = Object.freeze({
  'invalid-cache-bound': () => runtimeApi.createBarDataRuntime({
    resolveProvider: () => immediateProvider, maxCacheEntries: 0,
  }),
  'invalid-concurrency': () => runtimeApi.createBarDataRuntime({
    resolveProvider: () => immediateProvider, maxConcurrentRequests: 0,
  }),
  'invalid-resolver': () => runtimeApi.createBarDataRuntime({ resolveProvider: null }),
  'missing-provider-port': () => runtimeFor({}).acquire(request()),
  'response-identity-mismatch': () => runtimeFor({
    requestRawBars: () => batch(differentRequest),
  }).acquire(request()),
  'acquire-after-dispose': () => {
    const runtime = runtimeFor(immediateProvider);
    runtime.dispose();
    return runtime.acquire(request());
  },
});

for (const fixture of negativeCases) {
  assert.equal(await failureCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

console.log(`v7 Bar Data Runtime harness passed (${negativeCases.length} negative controls)`);
