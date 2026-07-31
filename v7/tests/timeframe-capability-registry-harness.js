import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFoundationCapabilities,
  createTimeframeCapabilityRegistry,
  FOUNDATION_IDS,
} from '../src/replay-workspace-composition/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/timeframe-capability-registry/negative/cases.json',
), 'utf8'));

function registration(id) {
  return Object.freeze({
    definition: Object.freeze({
      aggregationPolicyId: 'projection.synthetic',
      alignment: Object.freeze({ durationMs: 60_000, kind: 'fixed-duration' }),
      apiVersion: 1,
      contract: 'TimeframeDefinition',
      display: Object.freeze({ label: 'X', shortLabel: 'X' }),
      id,
      kind: 'timeframe',
      schemaVersion: 1,
      sourceResolutionIds: Object.freeze(['resolution.synthetic']),
      version: '1.0.0',
    }),
    historyPlanning: () => Object.freeze({ alignStartEpochMs: (value) => value, durationMs: 60_000 }),
    menuItem: Object.freeze({ id, label: 'X', menuLabel: 'extension' }),
    replayStepOption: null,
  });
}

function extension({
  alignmentPolicyIds = ['alignment.synthetic'],
  contribution = null,
  id = 'timeframe-extension.synthetic',
  timeframeId = 'timeframe.synthetic',
} = {}) {
  return Object.freeze({
    alignmentPolicyIds: Object.freeze(alignmentPolicyIds),
    apiVersion: 1,
    id,
    register: () => contribution ?? Object.freeze({
      entries: Object.freeze([]),
      menuGroups: Object.freeze([
        Object.freeze({ label: 'Synthetic', items: Object.freeze([{ id: timeframeId }]) }),
      ]),
      registrations: Object.freeze([registration(timeframeId)]),
    }),
    schemaVersion: 1,
  });
}

const capabilities = createFoundationCapabilities([
  FOUNDATION_IDS.instruments.nq,
  FOUNDATION_IDS.instruments.es,
]);
assert.equal(capabilities.timeframes.length, 16);
assert.deepEqual(capabilities.timeframeMenuGroups.map(({ label }) => label), [
  'Minutes', 'Hours', 'Calendar',
]);
assert.deepEqual(
  capabilities.timeframeMenuGroups.at(-1).items.map(({ label, unavailable }) => [label, unavailable]),
  [['1D', undefined], ['1W', undefined], ['1M', undefined]],
  'registered Calendar contributions must remain enabled without UI-owner branches',
);
for (const timeframeId of ['timeframe.display-1-day', 'timeframe.display-1-week', 'timeframe.display-1-month']) {
  const selection = capabilities.catalog.get({
    instrumentId: FOUNDATION_IDS.instruments.es,
    sessionHoursMode: 'rth',
    timeframeId,
  });
  assert.equal(capabilities.historyPlanning(selection).durationMs > 0, true);
  assert.equal(selection.displayTimeframe.id, timeframeId);
}

const synthetic = createTimeframeCapabilityRegistry({ context: Object.freeze({}), extensions: [extension()] });
assert.deepEqual(synthetic.alignmentPolicyIds, ['alignment.synthetic']);
assert.deepEqual(synthetic.timeframes, [{ id: 'timeframe.synthetic', label: 'X', replayStepId: null }]);
assert.equal(synthetic.historyPlanning({
  displayTimeframe: { id: 'timeframe.synthetic' },
}).alignStartEpochMs(123), 123);

const coreOwnerPaths = [
  'src/bar-data-runtime',
  'src/capability-contract',
  'src/lightweight-chart-adapter',
  'src/projection-domain',
  'src/replay-runtime',
  'src/replay-workspace-ui',
  'src/v4-bars-provider-adapter',
  'src/workspace-transaction-runtime',
];
const coreOwnerSources = coreOwnerPaths.flatMap((relativePath) => {
  const directory = path.join(V7_ROOT, relativePath);
  return fs.readdirSync(directory).filter((file) => file.endsWith('.js')).map((file) => ({
    path: path.join(relativePath, file),
    source: fs.readFileSync(path.join(directory, file), 'utf8'),
  }));
});
assert.deepEqual(
  coreOwnerSources.flatMap(({ source }) => findConcreteCapabilityIdBranches(source)),
  [],
  'existing core owners must remain free of concrete capability-id branches',
);
assert.deepEqual(
  coreOwnerSources.filter(({ source }) => source.includes('foundation-calendar-timeframe-capability')),
  [],
  'the Calendar extension must be imported only by its composition registration point',
);
const registrySource = fs.readFileSync(path.join(
  V7_ROOT, 'src/replay-workspace-composition/timeframe-capability-registry.js',
), 'utf8');
assert.equal(registrySource.includes('calendar-timeframe-domain'), false);
assert.equal(registrySource.includes('fixed-timeframe-domain'), false);
assert.deepEqual(findConcreteCapabilityIdBranches(registrySource), []);

const duplicateTimeframe = extension({ id: 'timeframe-extension.second' });
const negativeActions = {
  'empty-extension-set': () => createTimeframeCapabilityRegistry({ context: {}, extensions: [] }),
  'duplicate-extension-id': () => createTimeframeCapabilityRegistry({
    context: {}, extensions: [extension(), extension()],
  }),
  'duplicate-alignment-id': () => createTimeframeCapabilityRegistry({
    context: {}, extensions: [extension(), extension({ id: 'timeframe-extension.second' })],
  }),
  'invalid-contribution-shape': () => createTimeframeCapabilityRegistry({
    context: {}, extensions: [extension({ contribution: Object.freeze({ registrations: [] }) })],
  }),
  'duplicate-timeframe-id': () => createTimeframeCapabilityRegistry({
    context: {}, extensions: [
      extension(),
      Object.freeze({ ...duplicateTimeframe, alignmentPolicyIds: Object.freeze(['alignment.second']) }),
    ],
  }),
};
for (const fixture of negativeCases) {
  assert.throws(negativeActions[fixture.case], TypeError, fixture.case);
}

console.log(`v7 timeframe capability registry harness passed (${negativeCases.length} negative controls)`, {
  scope: 'fixed/calendar production registration, synthetic extension, zero core-owner branches',
});
