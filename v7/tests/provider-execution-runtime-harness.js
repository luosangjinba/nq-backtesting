import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBarDataRuntime } from '../src/bar-data-runtime/public.js';
import { createCoverageReport } from '../src/coverage-planning-contract/public.js';
import * as api from '../src/provider-execution-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/provider-execution-runtime/negative/cases.json'), 'utf8',
));

function policy(overrides = {}) {
  return {
    schemaVersion: 1,
    providerId: 'test.fake-provider',
    revision: { mode: 'discover', maxAgeMs: 100 },
    requestLimits: { maxBarsPerRequest: 2, maxWindowDurationMs: 120_000, maxConcurrentRequests: 2 },
    deadlineMs: 50,
    retry: { maxAttempts: 2, backoffMs: [0], retryableFailureKinds: ['timeout', 'unavailable'] },
    ...overrides,
  };
}

function request(index = 0, overrides = {}) {
  const start = 1_000_000 + index * 120_000;
  return {
    schemaVersion: 1, providerId: 'test.fake-provider', instrumentId: 'cme.nq',
    sourceResolutionId: 'fixed.1-minute', windowStartEpochMs: start,
    windowEndEpochMs: start + 120_000, datasetRevision: 'revision-1', ...overrides,
  };
}

function result(rawRequest, bars = 1) {
  return {
    batch: {
      schemaVersion: 1,
      request: rawRequest,
      bars: Array.from({ length: bars }, (_, index) => ({
        startEpochMs: rawRequest.windowStartEpochMs + index * 60_000,
        open: 100, high: 102, low: 99, close: 101, volume: 10,
      })),
    },
    coverage: createCoverageReport({
      schemaVersion: 1,
      request: rawRequest,
      segments: [{
        startEpochMs: rawRequest.windowStartEpochMs,
        endEpochMs: rawRequest.windowEndEpochMs,
        kind: 'data',
      }],
    }),
  };
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
  await Promise.resolve();
}

// Revision discovery is coalesced, cached by scope, and expires by policy TTL.
let now = 1_000;
let revisionCalls = 0;
const adapter = {
  providerId: 'test.fake-provider',
  resolveDatasetRevision() { revisionCalls += 1; return `revision-${revisionCalls}`; },
  requestRawBars(rawRequest) { return result(rawRequest); },
};
const provider = api.createPolicyBoundProvider({ policy: policy(), adapter, now: () => now });
const scope = { providerId: 'test.fake-provider', instrumentId: 'cme.nq', sourceResolutionId: 'fixed.1-minute' };
assert.equal(await provider.resolveDatasetRevision(scope), 'revision-1');
assert.equal(await provider.resolveDatasetRevision(scope), 'revision-1');
assert.equal(revisionCalls, 1);
now = 1_100;
assert.equal(await provider.resolveDatasetRevision(scope), 'revision-2');
assert.equal(revisionCalls, 2, 'discover revision must refresh at maxAgeMs');

// The wrapper remains compatible with the only raw cache/request owner.
const barRuntime = createBarDataRuntime({ resolveProvider: () => provider, maxConcurrentRequests: 3 });
const integratedBatch = await barRuntime.acquire(request());
assert.equal(integratedBatch.bars.length, 1);
assert.equal(provider.coverageFor(request()).segments[0].kind, 'data');
barRuntime.dispose();
provider.dispose();

// Caller teardown propagates through the wrapper to the concrete adapter.
let propagatedSignal;
const abortGate = deferred();
const abortProvider = api.createPolicyBoundProvider({
  policy: policy(),
  adapter: {
    providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
    requestRawBars(rawRequest, { signal }) { propagatedSignal = signal; return abortGate.promise.then(() => result(rawRequest)); },
  },
});
const abortRuntime = createBarDataRuntime({ resolveProvider: () => abortProvider });
const abortedAcquire = abortRuntime.acquire(request());
await flush();
abortRuntime.dispose();
await assert.rejects(abortedAcquire, (error) => error.code === 'BAR_DATA_RUNTIME_DISPOSED');
assert.equal(propagatedSignal.aborted, true, 'Bar Data Runtime abort must reach the concrete adapter');
abortGate.resolve();
abortProvider.dispose();

// Retryable failures retry exactly within policy; terminal failures do not.
let retryCalls = 0;
const retryProvider = api.createPolicyBoundProvider({
  policy: policy(),
  adapter: {
    providerId: 'test.fake-provider',
    resolveDatasetRevision: () => 'r1',
    requestRawBars(rawRequest) {
      retryCalls += 1;
      if (retryCalls === 1) throw { kind: 'unavailable', message: 'temporary', retryAfterMs: null };
      return result(rawRequest);
    },
  },
});
await retryProvider.requestRawBars(request());
assert.equal(retryCalls, 2);
retryProvider.dispose();

let terminalCalls = 0;
const terminalProvider = api.createPolicyBoundProvider({
  policy: policy(),
  adapter: {
    providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
    requestRawBars() {
      terminalCalls += 1;
      throw { kind: 'authorization', message: 'denied', retryAfterMs: null };
    },
  },
});
await assert.rejects(terminalProvider.requestRawBars(request()),
  (error) => error.code === 'PROVIDER_REQUEST_FAILED' && error.kind === 'authorization');
assert.equal(terminalCalls, 1);
terminalProvider.dispose();

// Provider concurrency is bounded and queued calls continue without user input.
const gates = [];
let active = 0;
let peak = 0;
const boundedProvider = api.createPolicyBoundProvider({
  policy: policy(),
  adapter: {
    providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
    requestRawBars(rawRequest) {
      active += 1;
      peak = Math.max(peak, active);
      const gate = deferred();
      gates.push({ gate, rawRequest });
      return gate.promise.finally(() => { active -= 1; });
    },
  },
});
const boundedPromises = [0, 1, 2].map((index) => boundedProvider.requestRawBars(request(index)));
await flush();
assert.equal(gates.length, 2);
gates[0].gate.resolve(result(gates[0].rawRequest));
await boundedPromises[0];
await flush();
assert.equal(gates.length, 3, 'queued request must start automatically');
gates[1].gate.resolve(result(gates[1].rawRequest));
gates[2].gate.resolve(result(gates[2].rawRequest));
await Promise.all(boundedPromises.slice(1));
assert.equal(peak, 2);
boundedProvider.dispose();

// Deadline uses an injected deterministic scheduler and aborts the adapter.
const scheduled = [];
const deadlineProvider = api.createPolicyBoundProvider({
  policy: policy({ retry: { maxAttempts: 1, backoffMs: [], retryableFailureKinds: ['timeout'] } }),
  schedule(callback) { const task = { callback, cancelled: false }; scheduled.push(task); return task; },
  cancel(task) { task.cancelled = true; },
  adapter: {
    providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
    requestRawBars(rawRequest, { signal }) {
      signal.addEventListener('abort', () => {}, { once: true });
      return new Promise(() => {});
    },
  },
});
const timedOut = deadlineProvider.requestRawBars(request());
await flush();
scheduled.find((task) => !task.cancelled).callback();
await assert.rejects(timedOut,
  (error) => error.code === 'PROVIDER_REQUEST_FAILED' && error.kind === 'timeout');
deadlineProvider.dispose();

// A complete acquisition plan starts without later pointer/wheel input.
const acquired = [];
const planned = await api.acquireCoveragePlan({
  acquire(rawRequest) { acquired.push(rawRequest); return Promise.resolve(rawRequest); },
}, [request(0), request(1), request(2)]);
assert.equal(planned.length, 3);
assert.equal(acquired.length, 3);
assert.equal(Object.isFrozen(planned), true);

const disposedProvider = api.createPolicyBoundProvider({ policy: policy(), adapter });
disposedProvider.dispose();
const validationProvider = api.createPolicyBoundProvider({ policy: policy(), adapter });

const negativeActions = {
  'invalid-clock-port': () => api.createPolicyBoundProvider({ policy: policy(), adapter, now: null }),
  'invalid-revision-scope': () => validationProvider.resolveDatasetRevision({ ...scope, sessionId: 'leak' }),
  'request-outside-policy': () => validationProvider.requestRawBars(request(0, { windowEndEpochMs: 1_180_001 })),
  'acquire-after-dispose': () => disposedProvider.requestRawBars(request()),
  'invalid-plan-runtime': () => api.acquireCoveragePlan({}, [request()]),
  'invalid-provider-result': async () => {
    const invalid = api.createPolicyBoundProvider({
      policy: policy(),
      adapter: {
        providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
        requestRawBars: () => ({ batch: result(request()).batch }),
      },
    });
    try { await invalid.requestRawBars(request()); } finally { invalid.dispose(); }
  },
  'bar-limit-exceeded': async () => {
    const excessive = api.createPolicyBoundProvider({
      policy: policy({
        requestLimits: { maxBarsPerRequest: 1, maxWindowDurationMs: 120_000, maxConcurrentRequests: 2 },
      }),
      adapter: {
        providerId: 'test.fake-provider', resolveDatasetRevision: () => 'r1',
        requestRawBars: (rawRequest) => result(rawRequest, 2),
      },
    });
    try { await excessive.requestRawBars(request()); } finally { excessive.dispose(); }
  },
};

for (const fixture of negativeCases) {
  await assert.rejects(
    Promise.resolve().then(negativeActions[fixture.case]),
    (error) => error instanceof api.ProviderExecutionError && error.code === fixture.expectedCode,
    fixture.case,
  );
}
validationProvider.dispose();

console.log(`v7 Provider Execution Runtime harness passed (${negativeCases.length} negative controls)`);
