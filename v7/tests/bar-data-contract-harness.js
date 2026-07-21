import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as barDataApi from '../src/bar-data-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/bar-data-contract/negative/cases.json'), 'utf8',
));

function request(overrides = {}) {
  return {
    schemaVersion: 1,
    providerId: 'local.v4-provider',
    instrumentId: 'cme.nq',
    sourceResolutionId: 'fixed.1-minute',
    windowStartEpochMs: 1_000_000,
    windowEndEpochMs: 1_180_000,
    datasetRevision: 'duckdb-demo-r1',
    ...overrides,
  };
}

function bar(startEpochMs, overrides = {}) {
  return { startEpochMs, open: 100, high: 102, low: 99, close: 101, volume: 42, ...overrides };
}

const normalizedRequest = barDataApi.createRawBarRequest(request());
assert.equal(Object.isFrozen(normalizedRequest), true);
assert.equal('sessionId' in normalizedRequest, false, 'raw identity must be Session-independent');
assert.equal('displayTimeframeId' in normalizedRequest, false, 'display TF must not fragment raw identity');
assert.equal('sessionHoursMode' in normalizedRequest, false, 'ETH/RTH must re-project shared raw bars');

const batch = barDataApi.createRawBarBatch({
  schemaVersion: 1,
  request: normalizedRequest,
  bars: [bar(1_000_000), bar(1_060_000, { open: 101, high: 103, low: 100, close: 102, volume: null })],
});
assert.equal(Object.isFrozen(batch), true);
assert.equal(Object.isFrozen(batch.bars), true);
assert.equal(Object.isFrozen(batch.bars[0]), true);
assert.equal(batch.requestKey, barDataApi.rawBarRequestKey(normalizedRequest));
assert.equal(barDataApi.createRawBarBatch(batch), batch,
  'a normalized batch must cross provider/runtime trust boundaries without full revalidation');
assert.equal(barDataApi.createRawBar(batch.bars[0]), batch.bars[0],
  'a normalized raw bar must retain its validated identity in downstream aggregation');
assert.deepEqual(
  barDataApi.createRawBarBatch({ schemaVersion: 1, request: normalizedRequest, bars: [] }).bars,
  [],
  'an empty successful window is data, not a synthetic transport error',
);

for (const identityField of [
  'providerId', 'instrumentId', 'sourceResolutionId', 'windowStartEpochMs',
  'windowEndEpochMs', 'datasetRevision',
]) {
  const original = request()[identityField];
  const changed = request({ [identityField]: typeof original === 'number' ? original + 1 : `${original}-alternate` });
  assert.notEqual(
    barDataApi.rawBarRequestKey(changed), barDataApi.rawBarRequestKey(request()),
    `${identityField} must participate in raw request identity`,
  );
}

const negativeActions = Object.freeze({
  'unknown-request-field': () => barDataApi.createRawBarRequest(request({ sessionId: 'leak' })),
  'unsupported-request-version': () => barDataApi.createRawBarRequest(request({ schemaVersion: 2 })),
  'invalid-provider-id': () => barDataApi.createRawBarRequest(request({ providerId: 'NQ' })),
  'reversed-window': () => barDataApi.createRawBarRequest(request({ windowStartEpochMs: 1_180_000 })),
  'blank-revision': () => barDataApi.createRawBarRequest(request({ datasetRevision: '' })),
  'unknown-bar-field': () => barDataApi.createRawBar({ ...bar(1_000_000), tradingDay: 'legacy' }),
  'invalid-price-envelope': () => barDataApi.createRawBar(bar(1_000_000, { high: 100.5, close: 101 })),
  'invalid-volume': () => barDataApi.createRawBar(bar(1_000_000, { volume: -1 })),
  'outside-window': () => barDataApi.createRawBarBatch({ schemaVersion: 1, request: request(), bars: [bar(1_180_000)] }),
  'forged-request-key': () => barDataApi.createRawBarBatch({
    schemaVersion: 1, request: request(), requestKey: 'forged', bars: [],
  }),
  'duplicate-timestamp': () => barDataApi.createRawBarBatch({ schemaVersion: 1, request: request(), bars: [bar(1_000_000), bar(1_000_000)] }),
  'descending-timestamps': () => barDataApi.createRawBarBatch({ schemaVersion: 1, request: request(), bars: [bar(1_060_000), bar(1_000_000)] }),
});

for (const fixture of negativeCases) {
  assert.throws(
    negativeActions[fixture.case],
    (error) => error instanceof barDataApi.BarDataContractError && error.code === fixture.expectedCode,
    fixture.case,
  );
}

console.log(`v7 Bar Data contract harness passed (${negativeCases.length} negative controls)`);
