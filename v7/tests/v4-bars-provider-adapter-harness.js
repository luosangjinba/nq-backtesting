import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createV4BarsAdapter,
  createV4MarketDateAvailability,
  exchangeWallSecondsToInstantMs,
  formatExchangeWallMinute,
  V4_BARS_DATASET_REVISION,
  V4_BARS_PROVIDER_ID,
} from '../src/v4-bars-provider-adapter/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/v4-bars-provider-adapter/negative/cases.json',
), 'utf8'));
assert.deepEqual(negativeCases, ['http-source-unavailable', 'unsupported-instrument']);
const productionMarketSource = fs.readFileSync(path.join(
  TEST_DIR, '../src/replay-workspace-ui/foundation-market.js',
), 'utf8');
assert.doesNotMatch(productionMarketSource, /Math\.sin|generateBars|sampleMinute/,
  'production workspace must not retain a synthetic market generator');

const MINUTE = 60_000;
const startEpochMs = Date.parse('2026-05-01T19:40:00Z');
const request = {
  schemaVersion: 1,
  providerId: V4_BARS_PROVIDER_ID,
  instrumentId: 'instrument.cme.nq',
  sourceResolutionId: 'resolution.fixed-1-minute',
  windowStartEpochMs: startEpochMs,
  windowEndEpochMs: startEpochMs + (2 * MINUTE),
  datasetRevision: V4_BARS_DATASET_REVISION,
};

assert.equal(formatExchangeWallMinute(startEpochMs), '2026-05-01 15:40');
assert.equal(formatExchangeWallMinute(Date.parse('2026-12-01T17:40:00Z')), '2026-12-01 12:40');
assert.equal(
  exchangeWallSecondsToInstantMs(Date.UTC(2026, 4, 1, 15, 40) / 1_000),
  startEpochMs,
);

const calls = [];
const wallSeconds = (hour, minute) => Date.UTC(2026, 4, 1, hour, minute) / 1_000;
const adapter = createV4BarsAdapter({
  apiBase: 'http://127.0.0.1:8766',
  fetchImpl: async (url, options) => {
    calls.push({ options, url });
    return {
      ok: true,
      async json() {
        return {
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

assert.equal(await adapter.resolveDatasetRevision(), V4_BARS_DATASET_REVISION);
const result = await adapter.requestRawBars(request);
assert.equal(calls.length, 1);
assert.equal(
  calls[0].url,
  'http://127.0.0.1:8766/v4/bars?end=2026-05-01+15%3A41&instrument=NQ&start=2026-05-01+15%3A40&tf=1',
);
assert.equal(calls[0].options.headers.Accept, 'application/json');
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

const chunkCalls = [];
const chunked = createV4BarsAdapter({
  fetchImpl: async (url) => {
    chunkCalls.push(url);
    return { ok: true, async json() { return { bars: [] }; } };
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

const failing = createV4BarsAdapter({
  fetchImpl: async () => ({
    ok: false, status: 500, async json() { return { error: 'database unavailable' }; },
  }),
});
await assert.rejects(
  () => failing.requestRawBars(request),
  (error) => error.kind === 'unavailable' && error.message === 'database unavailable',
);

let unsupportedFetches = 0;
const unsupported = createV4BarsAdapter({
  fetchImpl: async () => {
    unsupportedFetches += 1;
    return { ok: true, async json() { return { bars: [] }; } };
  },
});
await assert.rejects(
  () => unsupported.requestRawBars({ ...request, instrumentId: 'instrument.cme.mes' }),
  (error) => error.kind === 'unsupported'
    && error.message === 'V4 bars adapter does not support this instrument identity.',
);
assert.equal(unsupportedFetches, 0, 'unsupported instruments must fail before any market-data request');

const dateCalls = [];
const dateAvailability = createV4MarketDateAvailability({
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
  'http://127.0.0.1:8766/v4/available_dates?instrument=NQ&instrument=ES',
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

console.log('v7 V4 bars provider adapter harness passed');
