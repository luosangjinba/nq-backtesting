import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createMarketDataAdapter,
  createMarketDataProvider,
  createMarketDateAvailability,
  createMarketDataProjectedHistoryProvider,
  exchangeWallSecondsToInstantMs,
  formatExchangeWallMinute,
  MARKET_DATA_PROVIDER_ID,
  MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
} from '../src/market-data-provider-adapter/public.js';
import { createPolicyBoundProvider } from '../src/provider-execution-runtime/public.js';
import { createProjectedHistoryRequest } from '../src/projected-history-contract/public.js';
import { createFoundationMarket } from '../src/replay-workspace-composition/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/market-data-provider-adapter/negative/cases.json',
), 'utf8'));
assert.deepEqual(negativeCases, ['http-source-unavailable', 'unsupported-instrument']);
const datasetRevisionNegativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/market-dataset-revision/negative/cases.json',
), 'utf8'));
assert.equal(datasetRevisionNegativeCases.schemaVersion, 1);
assert.equal(Array.isArray(datasetRevisionNegativeCases.cases), true);
const productionMarketSource = fs.readFileSync(path.join(
  TEST_DIR, '../src/replay-workspace-composition/foundation-market.js',
), 'utf8');
assert.doesNotMatch(productionMarketSource, /Math\.sin|generateBars|sampleMinute/,
  'production workspace must not retain a synthetic market generator');

const MINUTE = 60_000;
const DATASET_REVISION = 'v7-duckdb-stat-v1-test';
const startEpochMs = Date.parse('2026-05-01T19:40:00Z');
const request = {
  schemaVersion: 1,
  providerId: MARKET_DATA_PROVIDER_ID,
  instrumentId: 'instrument.cme.nq',
  sourceResolutionId: 'resolution.fixed-1-minute',
  windowStartEpochMs: startEpochMs,
  windowEndEpochMs: startEpochMs + (2 * MINUTE),
  datasetRevision: DATASET_REVISION,
};

assert.equal(formatExchangeWallMinute(startEpochMs), '2026-05-01 15:40');
assert.equal(formatExchangeWallMinute(Date.parse('2026-12-01T17:40:00Z')), '2026-12-01 12:40');
assert.equal(
  exchangeWallSecondsToInstantMs(Date.UTC(2026, 4, 1, 15, 40) / 1_000),
  startEpochMs,
);

const calls = [];
const wallSeconds = (hour, minute) => Date.UTC(2026, 4, 1, hour, minute) / 1_000;
const adapter = createMarketDataAdapter({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url, options) => {
    calls.push({ options, url });
    if (url.endsWith('/v7/market-data/health')) {
      return {
        ok: true,
        async json() {
          return { databaseReady: true, datasetRevision: DATASET_REVISION };
        },
      };
    }
    return {
      ok: true,
      async json() {
        return {
          datasetRevision: DATASET_REVISION,
          bars: [
            { timestamp: wallSeconds(15, 39), open: 99, high: 100, low: 98, close: 99.5, volume: 1 },
            { timestamp: wallSeconds(15, 40), open: 100, high: 102, low: 99, close: 101, volume: 10 },
            { timestamp: wallSeconds(15, 41), open: 101, high: 103, low: 100, close: 102, volume: 11 },
            { timestamp: wallSeconds(15, 42), open: 102, high: 104, low: 101, close: 103, volume: 12 },
          ],
        };
      },
    };
  },
});

assert.equal(await adapter.resolveDatasetRevision({
  instrumentId: 'instrument.cme.nq',
  providerId: MARKET_DATA_PROVIDER_ID,
  sourceResolutionId: 'resolution.fixed-1-minute',
}), DATASET_REVISION);
const result = await adapter.requestRawBars(request);
assert.equal(calls.length, 2);
assert.equal(
  calls[1].url,
  'http://127.0.0.1:8766/v7/market-data/bars?datasetRevision=v7-duckdb-stat-v1-test&end=2026-05-01+15%3A41&instrument=NQ&start=2026-05-01+15%3A40&tf=1',
);
assert.equal(calls[1].options.headers.Accept, 'application/json');
assert.deepEqual(result.batch.bars, [
  { startEpochMs, open: 100, high: 102, low: 99, close: 101, volume: 10 },
  { startEpochMs: startEpochMs + MINUTE, open: 101, high: 103, low: 100, close: 102, volume: 11 },
]);
assert.equal(result.coverage.segments.length, 1);
assert.deepEqual(result.coverage.segments[0], {
  startEpochMs,
  endEpochMs: startEpochMs + (2 * MINUTE),
  kind: 'data',
});

let warmRevisionHealthCalls = 0;
const warmRevisionProvider = createMarketDataProvider({
  fetchImpl: async (url) => {
    assert.match(url, /\/v7\/market-data\/health$/);
    warmRevisionHealthCalls += 1;
    return {
      ok: true,
      status: 200,
      async json() { return { databaseReady: true, datasetRevision: DATASET_REVISION }; },
    };
  },
});
const warmRevisionScope = {
  instrumentId: 'instrument.cme.nq',
  providerId: MARKET_DATA_PROVIDER_ID,
  sourceResolutionId: 'resolution.fixed-1-minute',
};
for (let advance = 0; advance < 128; advance += 1) {
  assert.equal(await warmRevisionProvider.resolveDatasetRevision(warmRevisionScope), DATASET_REVISION);
}
assert.equal(warmRevisionHealthCalls, 1,
  'one active read-only runtime must not put revision HTTP discovery in each warm Replay advance');
warmRevisionProvider.dispose();

const chunkCalls = [];
let activeChunkCalls = 0;
let maximumActiveChunkCalls = 0;
const chunked = createMarketDataAdapter({
  fetchImpl: async (url) => {
    chunkCalls.push(url);
    activeChunkCalls += 1;
    maximumActiveChunkCalls = Math.max(maximumActiveChunkCalls, activeChunkCalls);
    await new Promise((resolve) => setTimeout(resolve, 0));
    activeChunkCalls -= 1;
    return { ok: true, async json() { return { bars: [], datasetRevision: DATASET_REVISION }; } };
  },
});
await chunked.requestRawBars({
  ...request,
  windowEndEpochMs: startEpochMs + (15 * 24 * 60 * MINUTE),
});
assert.equal(chunkCalls.length, 3, 'large logical requests must yield between bounded API transfers');
assert.match(chunkCalls[0], /end=2026-05-08\+15%3A39/);
assert.match(chunkCalls[1], /start=2026-05-08\+15%3A40/);
assert.match(chunkCalls[2], /start=2026-05-15\+15%3A40/);
assert.equal(maximumActiveChunkCalls, 2,
  'large logical requests must use the bounded two-transfer adapter pool');

const failing = createMarketDataAdapter({
  fetchImpl: async () => ({
    ok: false, status: 500, async json() { return { error: 'database unavailable' }; },
  }),
});
await assert.rejects(
  () => failing.requestRawBars(request),
  (error) => error.kind === 'unavailable' && error.message === 'database unavailable',
);

const datasetRevisionNegativeActions = {
  'stale-dataset-revision-response': async () => {
    const staleResponse = createMarketDataAdapter({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async json() { return { bars: [], datasetRevision: 'different-revision' }; },
      }),
    });
    try {
      await staleResponse.requestRawBars(request);
    } catch (error) {
      return error?.kind ?? null;
    }
    return null;
  },
  'revision-mismatch-invalidates-revision-bound-cache': async () => {
    let revisionCalls = 0;
    const revisionProvider = createPolicyBoundProvider({
      now: () => 1_000,
      policy: {
        schemaVersion: 1,
        providerId: MARKET_DATA_PROVIDER_ID,
        revision: { mode: 'immutable', maxAgeMs: null },
        requestLimits: {
          maxBarsPerRequest: 2,
          maxWindowDurationMs: 2 * MINUTE,
          maxConcurrentRequests: 1,
        },
        deadlineMs: 1_000,
        retry: { maxAttempts: 1, backoffMs: [], retryableFailureKinds: [] },
      },
      adapter: createMarketDataAdapter({
        fetchImpl: async (url) => {
          if (url.endsWith('/v7/market-data/health')) {
            revisionCalls += 1;
            return {
              ok: true,
              status: 200,
              async json() {
                return { databaseReady: true, datasetRevision: `cache-revision-${revisionCalls}` };
              },
            };
          }
          return {
            ok: true,
            status: 200,
            async json() { return { bars: [], datasetRevision: 'cache-revision-2' }; },
          };
        },
      }),
    });
    try {
      const revisionScope = {
        instrumentId: 'instrument.cme.nq',
        providerId: MARKET_DATA_PROVIDER_ID,
        sourceResolutionId: 'resolution.fixed-1-minute',
      };
      const firstRevision = await revisionProvider.resolveDatasetRevision(revisionScope);
      let failureCode = null;
      try {
        await revisionProvider.requestRawBars({ ...request, datasetRevision: firstRevision });
      } catch (error) {
        assert.equal(error?.kind, 'revision-mismatch');
        failureCode = error?.code ?? null;
      }
      assert.equal(await revisionProvider.resolveDatasetRevision(revisionScope), 'cache-revision-2',
        'revision mismatch must invalidate the revision-bound cache before the next discovery');
      assert.equal(revisionCalls, 2,
        'cache invalidation must force a fresh authoritative dataset revision request');
      return failureCode;
    } finally {
      revisionProvider.dispose();
    }
  },
};

for (const fixture of datasetRevisionNegativeCases.cases) {
  assert.equal(typeof fixture.expectedFailureCode, 'string',
    `${fixture.case} must declare a stable expectedFailureCode`);
  assert.equal(typeof datasetRevisionNegativeActions[fixture.case], 'function',
    `${fixture.case} must have an executable negative action`);
  assert.equal(
    await datasetRevisionNegativeActions[fixture.case](),
    fixture.expectedFailureCode,
    `${fixture.case} must fail with its declared code`,
  );
}

let unsupportedFetches = 0;
const unsupported = createMarketDataAdapter({
  fetchImpl: async () => {
    unsupportedFetches += 1;
    return { ok: true, async json() { return { bars: [] }; } };
  },
});
await assert.rejects(
  () => unsupported.requestRawBars({ ...request, instrumentId: 'instrument.cme.mes' }),
  (error) => error.kind === 'unsupported'
    && error.message === 'Market data adapter does not support this instrument identity.',
);
assert.equal(unsupportedFetches, 0, 'unsupported instruments must fail before any market-data request');

const projectedCalls = [];
const projectedStartEpochMs = Date.parse('2026-05-01T12:00:00Z');
const projectedRequest = createProjectedHistoryRequest({
  aggregationPolicyRevision: 'fixed-240m-eth-r1',
  alignmentKind: 'fixed-duration',
  alignmentPolicyId: null,
  calendarRevision: 'calendar-r1',
  datasetRevision: DATASET_REVISION,
  displayTimeframeId: 'timeframe.display-4-hour',
  durationMs: 240 * MINUTE,
  instrumentId: 'instrument.cme.nq',
  providerId: MARKET_DATA_PROJECTED_HISTORY_PROVIDER_ID,
  schemaVersion: 1,
  sessionHoursMode: 'eth',
  windowEndEpochMs: projectedStartEpochMs + (240 * MINUTE),
  windowStartEpochMs: projectedStartEpochMs,
});
const projectedProvider = createMarketDataProjectedHistoryProvider({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url) => {
    projectedCalls.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          bars: [{
            close: 101,
            displayTimestamp: (projectedStartEpochMs + (239 * MINUTE)) / 1_000,
            high: 102,
            low: 99,
            open: 100,
            timestamp: projectedStartEpochMs / 1_000,
            volume: 20,
          }],
          datasetRevision: DATASET_REVISION,
          sessionHoursMode: 'eth',
          targetDurationMinutes: 240,
          targetTimeframe: '240',
        };
      },
    };
  },
});
const projectedBatch = await projectedProvider.requestProjectedHistory(projectedRequest);
assert.equal(projectedCalls[0],
  'http://127.0.0.1:8766/v7/market-data/projected-history?datasetRevision=v7-duckdb-stat-v1-test&end=2026-05-01+12%3A00&instrument=NQ&session=eth&start=2026-05-01+08%3A00&tf=240');
assert.equal(projectedBatch.bars.length, 1);
assert.equal(projectedBatch.bars[0].displayEpochMs, projectedStartEpochMs + (239 * MINUTE));

const dateCalls = [];
const dateAvailability = createMarketDateAvailability({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url) => {
    dateCalls.push(url);
    return {
      ok: true,
      async json() {
        return {
          schemaVersion: 1,
          timeZone: 'America/New_York',
          instruments: [
            {
              instrument: 'NQ', dates: ['2026-07-20', '2026-07-22'],
              firstTimestamp: '2026-07-20T09:31', latestTimestamp: '2026-07-22T06:59',
            },
            {
              instrument: 'ES', dates: ['2026-07-20'],
              firstTimestamp: '2026-07-20T09:30', latestTimestamp: '2026-07-20T16:59',
            },
          ],
        };
      },
    };
  },
});
const availableDates = await dateAvailability.loadAvailableDates([
  'instrument.cme.nq', 'instrument.cme.es',
]);
assert.equal(
  dateCalls[0],
  'http://127.0.0.1:8766/v7/market-data/available-dates?instrument=NQ&instrument=ES',
);
assert.deepEqual(availableDates['instrument.cme.nq'], {
  dates: ['2026-07-20', '2026-07-22'],
  firstTimestamp: '2026-07-20T09:31',
  latestTimestamp: '2026-07-22T06:59',
});
await assert.rejects(
  () => dateAvailability.loadAvailableDates(['instrument.cme.mes']),
  /unsupported instrument/,
);

const plannedRevisions = ['dataset-discovered-r1', 'dataset-discovered-r2'];
const revisionAwareMarket = createFoundationMarket({
  configuration: {
    historicalRange: {
      endEpochMs: startEpochMs + (10 * MINUTE),
      startEpochMs,
    },
  },
}, {
  projectedHistoryProvider: { dispose() {} },
  provider: {
    dispose() {},
    resolveDatasetRevision: async () => plannedRevisions.shift(),
  },
});
await revisionAwareMarket.resolveDatasetRevision('instrument.cme.nq');
assert.equal(revisionAwareMarket.requestWindow({
  instrumentId: 'instrument.cme.nq',
  windowEndEpochMs: startEpochMs + MINUTE,
  windowStartEpochMs: startEpochMs,
}).datasetRevision, 'dataset-discovered-r1');
await revisionAwareMarket.resolveDatasetRevision('instrument.cme.nq');
assert.equal(revisionAwareMarket.requestWindow({
  instrumentId: 'instrument.cme.nq',
  windowEndEpochMs: startEpochMs + MINUTE,
  windowStartEpochMs: startEpochMs,
}).datasetRevision, 'dataset-discovered-r2',
  'foundation request planning must adopt a newly discovered database revision');
revisionAwareMarket.dispose();

console.log(`v7 market-data provider adapter harness passed (${datasetRevisionNegativeCases.cases.length} dataset-revision negative controls)`);
