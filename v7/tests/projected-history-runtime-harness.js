import assert from 'node:assert/strict';
import { createProjectedHistoryRuntime } from '../src/bar-data-runtime/public.js';
import {
  createProjectedHistoryBatch,
  createProjectedHistoryRequest,
} from '../src/projected-history-contract/public.js';

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
runtime.dispose();
await assert.rejects(runtime.acquire(request), /disposed/);

console.log('v7 projected history runtime harness passed');
