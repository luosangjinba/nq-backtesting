import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCacheLatencyContract } from './support/cache-latency-contract-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const positive = JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, 'docs/v7-cache-latency-contract.json'), 'utf8'),
);
assert.deepEqual(validateCacheLatencyContract(positive), [], 'cache/latency contract must pass');
const invalidFourHour = structuredClone(positive);
const fourHourNegative = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/replay-four-hour-latency/negative/request-bound.json',
), 'utf8'));
invalidFourHour.profiles['manual-next-four-hour-bulk-reveal']
  .maximumProviderRequests.requests = fourHourNegative.requests;
assert.ok(validateCacheLatencyContract(invalidFourHour)
  .some(({ code }) => code === fourHourNegative.expectedFailureCode),
'4h Replay bulk-reveal request bound must fail closed');

const hotPathNegativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/cloud-replay-hot-path/negative/cases.json',
), 'utf8'));
const hotPathMutations = {
  'warm-network-request': (model) => { model.hotPath.warmMarketDataRequestsPerAdvance = 1; },
  'mutable-runtime-revision': (model) => { model.hotPath.datasetRevision.policy = 'discover-ttl'; },
  'database-replacement-without-restart': (model) => {
    model.hotPath.datasetRevision.replacementRequiresServiceRestart = false;
  },
  'completion-plus-full-cadence': (model) => {
    model.profiles['auto-replay-cache-tiered'].processingTimeCompensated = false;
  },
};
for (const fixture of hotPathNegativeCases.cases) {
  const model = structuredClone(positive);
  hotPathMutations[fixture.case](model);
  assert.ok(validateCacheLatencyContract(model)
    .some(({ code }) => code === fixture.expectedFailureCode),
  `${fixture.case} must fail with ${fixture.expectedFailureCode}`);
}

const interactions = JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, 'docs/v7-foundation-interactions.json'), 'utf8'),
);
const profiledCapabilities = new Set([
  'manual-next',
  'timeframe-switch',
  'session-hours-switch',
  'history-left',
  'auto-replay',
  'latency-failure-presentation',
]);
for (const interaction of interactions.foundationInteractions) {
  if (!profiledCapabilities.has(interaction.capability)) continue;
  assert.ok(positive.profiles[interaction.performanceProfile], `${interaction.id} has unknown performance profile`);
  assert.ok(interaction.refreshPolicy, `${interaction.id} requires an explicit refresh policy`);
}

const directory = path.join(TEST_DIR, 'fixtures/cache-latency/negative');
const files = fs.readdirSync(directory).filter((file) => file.endsWith('.json')).sort();
assert.equal(files.length, 6, 'R0.4 requires six cache/latency negative controls');
for (const file of files) {
  const fixture = JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
  const codes = validateCacheLatencyContract(fixture.model).map((violation) => violation.code);
  assert.ok(
    codes.includes(fixture.expectedFailureCode),
    `${file} must fail with ${fixture.expectedFailureCode}; got ${codes.join(', ') || 'no failure'}`,
  );
}

console.log(`v7 cache/latency contract harness passed (${Object.keys(positive.profiles).length} profiles, ${files.length + hotPathNegativeCases.cases.length} negative controls)`);
