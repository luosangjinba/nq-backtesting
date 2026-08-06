import assert from 'node:assert/strict';
import { createProjectedHistoryRuntime } from '../src/bar-data-runtime/public.js';
import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
} from '../src/projected-history-contract/public.js';

function deferred() {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });
  return { promise, reject, resolve };
}

const request = createProjectedHistoryRequest({
  aggregationPolicyRevision: 'fixed-240m-eth-r1',
  alignmentKind: 'fixed-duration',
  alignmentPolicyId: null,
  calendarRevision: 'calendar-r1',
  datasetRevision: 'dataset-r1',
  displayTimeframeId: 'timeframe.display-4-hour',
  durationMs: 14_400_000,
  instrumentId: 'instrument.cme.nq',
  providerId: 'provider.test.projected-history',
  schemaVersion: 1,
  sessionHoursMode: 'eth',
  windowEndEpochMs: 28_800_000,
  windowStartEpochMs: 14_400_000,
});
const calendarRequest = createProjectedHistoryRequest({
  ...request,
  aggregationPolicyRevision: 'calendar-day-eth-r1',
  alignmentKind: 'calendar',
  alignmentPolicyId: 'alignment.calendar-day',
  displayTimeframeId: 'timeframe.display-1-day',
  durationMs: null,
});
const calendarBar = {
  close: 101,
  displayEpochMs: 28_740_000,
  high: 102,
  labelDate: '1970-01-01',
  low: 99,
  open: 100,
  startEpochMs: 14_400_000,
  volume: 10,
};
assert.equal(createProjectedHistoryBatch({
  bars: [calendarBar], request: calendarRequest, schemaVersion: 1,
}).bars[0].labelDate, '1970-01-01');
assert.throws(() => createProjectedHistoryBatch({
  bars: [{ ...calendarBar, labelDate: undefined }],
  request: calendarRequest,
  schemaVersion: 1,
}), /label-date semantics/);
assert.throws(() => createProjectedHistoryBatch({
  bars: [{ ...calendarBar, labelDate: '1970-02-30' }],
  request: calendarRequest,
  schemaVersion: 1,
}), /label date is invalid/);
assert.throws(() => createProjectedHistoryBatch({
  bars: [calendarBar], request, schemaVersion: 1,
}), /label-date semantics/);
let providerCalls = 0;
const runtime = createProjectedHistoryRuntime({
  maxCacheEntries: 2,
  maxConcurrentRequests: 1,
  resolveProvider: () => ({
    async requestProjectedHistory(candidate) {
      providerCalls += 1;
      return createProjectedHistoryBatch({
        bars: [{
          close: 101,
          displayEpochMs: 28_740_000,
          high: 102,
          low: 99,
          open: 100,
          startEpochMs: 14_400_000,
          volume: 10,
        }],
        request: candidate,
        schemaVersion: 1,
      });
    },
  }),
});

const [first, shared] = await Promise.all([runtime.acquire(request), runtime.acquire(request)]);
assert.equal(first, shared, 'identical projected history requests must share one in-flight result');
assert.equal((await runtime.acquire(request)), first, 'accepted projected history must enter the cache');
assert.equal(providerCalls, 1);
const revisedRequest = createProjectedHistoryRequest({
  ...request,
  datasetRevision: 'dataset-r2',
});
const revised = await runtime.acquire(revisedRequest);
assert.notEqual(revised, first,
  'a projected-history dataset revision change must not reuse the prior cache entry');
assert.equal(providerCalls, 2);
runtime.dispose();
await assert.rejects(runtime.acquire(request), /disposed/);

const sharedGate = deferred();
let sharedProviderSignal = null;
let sharedProviderCalls = 0;
const cancellable = createProjectedHistoryRuntime({
  maxCacheEntries: 2,
  maxConcurrentRequests: 1,
  resolveProvider: () => ({
    requestProjectedHistory(candidate, { signal }) {
      sharedProviderCalls += 1;
      sharedProviderSignal = signal;
      return sharedGate.promise.then(() => createProjectedHistoryBatch({
        bars: [], request: candidate, schemaVersion: 1,
      }));
    },
  }),
});
const firstConsumer = new AbortController();
const secondConsumer = new AbortController();
const cancelledShared = cancellable.acquire(request, { signal: firstConsumer.signal });
const retainedShared = cancellable.acquire(request, { signal: secondConsumer.signal });
await Promise.resolve();
firstConsumer.abort('superseded');
await assert.rejects(cancelledShared, (error) => error?.code === 'PROJECTED_HISTORY_CANCELLED');
assert.equal(sharedProviderSignal.aborted, false,
  'one cancelled consumer must not abort a shared request still needed by another transaction');
sharedGate.resolve();
assert.equal((await retainedShared).requestKey, first.requestKey);
assert.equal(sharedProviderCalls, 1, 'active consumers must share one projected-history provider request');
cancellable.dispose();

let soleProviderSignal = null;
const soleConsumerRuntime = createProjectedHistoryRuntime({
  maxCacheEntries: 2,
  maxConcurrentRequests: 1,
  resolveProvider: () => ({
    requestProjectedHistory(_candidate, { signal }) {
      soleProviderSignal = signal;
      return new Promise((_resolve, reject) => {
        const abort = () => reject(signal.reason);
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
      });
    },
  }),
});
const soleConsumer = new AbortController();
const cancelledSole = soleConsumerRuntime.acquire(calendarRequest, { signal: soleConsumer.signal });
await Promise.resolve();
soleConsumer.abort('transaction-superseded');
await assert.rejects(cancelledSole, (error) => error?.code === 'PROJECTED_HISTORY_CANCELLED');
assert.equal(soleProviderSignal.aborted, true,
  'the provider request must abort when its final transaction consumer is cancelled');
soleConsumerRuntime.dispose();

console.log('v7 projected history runtime harness passed');
