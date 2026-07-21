import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createRawBarBatch } from '../src/bar-data-contract/public.js';
import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../src/capability-contract/public.js';
import {
  createFixedDurationAggregationPolicy,
  projectFixedDurationBars,
  resolveFixedBucketStart,
} from '../src/fixed-timeframe-domain/public.js';
import { projectPaneSnapshot } from '../src/projection-domain/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../src/replay-contract/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from '../src/replay-workspace-ui/foundation-capabilities.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/fixed-timeframe-domain/negative/cases.json',
), 'utf8'));
const MINUTE = 60_000;
const epoch = (label) => Date.parse(`${label}:00Z`);

function bar(label, index, overrides = {}) {
  return Object.freeze({
    startEpochMs: epoch(label),
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 10 + index,
    ...overrides,
  });
}

const sourceBars = Object.freeze([
  bar('2026-06-08T09:30', 0),
  bar('2026-06-08T09:31', 1),
  bar('2026-06-08T09:32', 2, { high: 1_000 }),
  bar('2026-06-08T09:33', 3),
  bar('2026-06-08T09:34', 4),
  bar('2026-06-08T09:35', 5),
]);

const projected = projectFixedDurationBars({
  bars: sourceBars,
  durationMs: 5 * MINUTE,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
});
assert.deepEqual(projected, [
  {
    displayEpochMs: epoch('2026-06-08T09:34'),
    startEpochMs: epoch('2026-06-08T09:30'),
    open: 100, high: 1_000, low: 99, close: 105, volume: 60,
  },
  {
    displayEpochMs: epoch('2026-06-08T09:39'),
    startEpochMs: epoch('2026-06-08T09:35'),
    open: 105, high: 107, low: 104, close: 106, volume: 15,
  },
]);
assert.equal(Object.isFrozen(projected), true);
assert.equal(Object.isFrozen(projected[0]), true);
for (const [label, durationMinutes, expected] of [
  ['2026-06-08T12:40', 4, '2026-06-08T12:43'],
  ['2026-06-08T12:10', 30, '2026-06-08T12:29'],
  ['2026-06-08T12:40', 30, '2026-06-08T12:59'],
  ['2026-06-08T12:40', 60, '2026-06-08T12:59'],
]) {
  assert.equal(projectFixedDurationBars({
    bars: [bar(label, 0)],
    durationMs: durationMinutes * MINUTE,
    offsetMs: 0,
    sourceDurationMs: MINUTE,
  })[0].displayEpochMs, epoch(expected));
}
assert.equal(projectFixedDurationBars({
  bars: [sourceBars[0], { ...sourceBars[1], volume: null }],
  durationMs: 5 * MINUTE,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
})[0].volume, null, 'partial volume availability must remain unknown');

assert.equal(resolveFixedBucketStart({
  durationMs: 60 * MINUTE,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
  startEpochMs: epoch('2026-06-08T09:30'),
}), epoch('2026-06-08T09:00'));
assert.equal(resolveFixedBucketStart({
  durationMs: 4 * 60 * MINUTE,
  offsetMs: 2 * 60 * MINUTE,
  sourceDurationMs: MINUTE,
  startEpochMs: epoch('2026-06-08T19:00'),
}), epoch('2026-06-08T18:00'));

const foundationCapabilities = createFoundationCapabilities();
const exchangeSourceBar = Object.freeze({
  startEpochMs: Date.parse('2026-05-01T16:40:00Z'),
  open: 100, high: 102, low: 99, close: 101, volume: 10,
});
for (const [timeframeId, expectedMinute] of [
  ['timeframe.display-4-minute', '43'],
  ['timeframe.display-1-hour', '59'],
  ['timeframe.display-2-hour', '59'],
  ['timeframe.display-4-hour', '59'],
  ['timeframe.display-8-hour', '59'],
  ['timeframe.display-12-hour', '59'],
]) {
  const projectedByMode = ['eth', 'rth'].map((sessionHoursMode) => {
    const selection = foundationCapabilities.catalog.get({
      instrumentId: FOUNDATION_IDS.instrument, sessionHoursMode, timeframeId,
    });
    return selection.aggregationPolicy.project([exchangeSourceBar], {
      aggregationPolicyRevision: selection.aggregationPolicy.revision,
      displayTimeframe: selection.displayTimeframe,
      sourceResolutionId: FOUNDATION_IDS.resolution,
    })[0].displayEpochMs;
  });
  assert.equal(projectedByMode[0], projectedByMode[1],
    `${timeframeId} must use the same exchange-clock grid in ETH and RTH`);
  assert.equal(new Intl.DateTimeFormat('en-US', {
    minute: '2-digit', timeZone: 'America/New_York',
  }).format(projectedByMode[1]), expectedMinute,
  `${timeframeId} RTH completion minute is incorrect`);
}

function base(kind, contract, id) {
  return {
    schemaVersion: 1,
    apiVersion: 1,
    kind,
    contract,
    id,
    version: '1.0.0',
    display: { label: id, shortLabel: id },
  };
}

const IDS = Object.freeze({
  aggregation: 'projection.fixed.five-minute',
  calendar: 'calendar.test',
  instrument: 'instrument.test',
  provider: 'provider.test',
  resolution: 'resolution.one-minute',
  sessionHours: 'session.test',
  timeframe: 'timeframe.five-minute',
});
const instrument = defineInstrument({
  ...base('instrument', 'InstrumentDefinition', IDS.instrument),
  symbol: 'TEST',
  priceIncrement: '0.25',
  quantityIncrement: '1',
  exchangeTimeZone: 'America/New_York',
  calendarId: IDS.calendar,
  providerIds: [IDS.provider],
});
const calendar = defineTradingCalendar({
  ...base('calendar', 'TradingCalendar', IDS.calendar),
  timeZone: 'America/New_York',
  revision: 'calendar-r1',
  sessionHoursPolicyIds: [IDS.sessionHours],
  alignmentPolicyIds: ['alignment.fixed-duration'],
});
const timeframe = (overrides = {}) => defineTimeframe({
  ...base('timeframe', 'TimeframeDefinition', IDS.timeframe),
  alignment: { kind: 'fixed-duration', durationMs: 5 * MINUTE },
  aggregationPolicyId: IDS.aggregation,
  sourceResolutionIds: [IDS.resolution],
  ...overrides,
});
const transactionIdentity = createWorkspaceTransactionIdentity({
  activationGeneration: createActivationGeneration(1),
  sessionId: createSessionId('session-fixed-timeframe'),
  transactionId: createTransactionId('transaction-fixed-timeframe'),
});

function proposal(targetEpochMs) {
  const cursorEpochMs = epoch('2026-06-08T09:29');
  return createReplayCursorProposal({
    advance: createReplayAdvanceInput({ source: 'manual', durationMs: targetEpochMs - cursorEpochMs }),
    baseRevision: 0,
    cursorEpochMs,
    identity: transactionIdentity,
    range: {
      startEpochMs: epoch('2026-06-08T09:00'),
      endEpochMs: epoch('2026-06-08T11:00'),
    },
  });
}

const policy = createFixedDurationAggregationPolicy({
  schemaVersion: 1,
  durationMs: 5 * MINUTE,
  id: IDS.aggregation,
  offsetMs: 0,
  revision: 'fixed-five-r1',
  sourceDurationMs: MINUTE,
});
const rawBatch = createRawBarBatch({
  schemaVersion: 1,
  request: {
    schemaVersion: 1,
    providerId: IDS.provider,
    instrumentId: IDS.instrument,
    sourceResolutionId: IDS.resolution,
    windowStartEpochMs: epoch('2026-06-08T09:30'),
    windowEndEpochMs: epoch('2026-06-08T09:36'),
    datasetRevision: 'dataset-r1',
  },
  bars: sourceBars,
});

function projectionInput(overrides = {}) {
  return {
    schemaVersion: 1,
    paneId: 'pane-fixed',
    instrument,
    calendar,
    displayTimeframe: timeframe(),
    sourceBatches: [rawBatch],
    cursorProposal: proposal(epoch('2026-06-08T09:36')),
    sessionHoursPolicy: Object.freeze({
      deterministic: true,
      id: IDS.sessionHours,
      isEligible: (candidate) => candidate.startEpochMs !== epoch('2026-06-08T09:32'),
      mode: 'eth',
      revision: 'session-r1',
    }),
    aggregationPolicy: policy,
    ...overrides,
  };
}

const integrated = projectPaneSnapshot(projectionInput());
assert.equal(integrated.bars[0].high, 106, 'eligibility must run before fixed aggregation');
assert.equal(integrated.bars[0].volume, 48, 'every eligible source bar contributes exactly once');
const partial = projectPaneSnapshot(projectionInput({
  cursorProposal: proposal(epoch('2026-06-08T09:33')),
}));
assert.deepEqual(partial.bars, [{
  displayEpochMs: epoch('2026-06-08T09:34'),
  startEpochMs: epoch('2026-06-08T09:30'),
  open: 100, high: 103, low: 99, close: 102, volume: 21,
}], 'exclusive cursor may expose a deterministic partial active bucket');

const alternatePolicy = createFixedDurationAggregationPolicy({
  schemaVersion: 1,
  durationMs: 15 * MINUTE,
  id: 'projection.fixed.fifteen-minute',
  offsetMs: 0,
  revision: 'fixed-fifteen-r1',
  sourceDurationMs: MINUTE,
});
const context = (selectedPolicy, durationMs, sourceResolutionId = IDS.resolution) => Object.freeze({
  aggregationPolicyRevision: selectedPolicy.revision,
  displayTimeframe: defineTimeframe({
    ...base('timeframe', 'TimeframeDefinition', `timeframe.duration-${durationMs}`),
    alignment: { kind: 'fixed-duration', durationMs },
    aggregationPolicyId: selectedPolicy.id,
    sourceResolutionIds: [IDS.resolution],
  }),
  sourceResolutionId,
});
const fiveBefore = policy.project(sourceBars, context(policy, 5 * MINUTE));
alternatePolicy.project(sourceBars, context(alternatePolicy, 15 * MINUTE));
assert.deepEqual(
  policy.project(sourceBars, context(policy, 5 * MINUTE)),
  fiveBefore,
  'interleaved newer policy work cannot alter an older immutable policy closure',
);
assert.equal(Object.isFrozen(policy), true);
assert.deepEqual(Object.keys(policy).sort(), ['deterministic', 'id', 'project', 'revision']);

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const policyInput = (overrides = {}) => ({
  schemaVersion: 1,
  durationMs: 5 * MINUTE,
  id: IDS.aggregation,
  offsetMs: 0,
  revision: 'fixed-five-r1',
  sourceDurationMs: MINUTE,
  ...overrides,
});
const aggregationInput = (overrides = {}) => ({
  bars: sourceBars,
  durationMs: 5 * MINUTE,
  offsetMs: 0,
  sourceDurationMs: MINUTE,
  ...overrides,
});
const negativeActions = {
  'unknown-policy-field': () => createFixedDurationAggregationPolicy({ ...policyInput(), extra: true }),
  'unsupported-version': () => createFixedDurationAggregationPolicy(policyInput({ schemaVersion: 2 })),
  'zero-duration': () => createFixedDurationAggregationPolicy(policyInput({ durationMs: 0 })),
  'source-longer-than-target': () => createFixedDurationAggregationPolicy(policyInput({ sourceDurationMs: 10 * MINUTE })),
  'duration-not-source-multiple': () => createFixedDurationAggregationPolicy(policyInput({ durationMs: 7 * MINUTE, sourceDurationMs: 5 * MINUTE })),
  'offset-outside-duration': () => createFixedDurationAggregationPolicy(policyInput({ offsetMs: 5 * MINUTE })),
  'offset-not-source-aligned': () => createFixedDurationAggregationPolicy(policyInput({ offsetMs: 30_000 })),
  'empty-source': () => projectFixedDurationBars(aggregationInput({ bars: [] })),
  'unordered-source': () => projectFixedDurationBars(aggregationInput({ bars: [sourceBars[1], sourceBars[0]] })),
  'duplicate-source': () => projectFixedDurationBars(aggregationInput({ bars: [sourceBars[0], sourceBars[0]] })),
  'misaligned-source': () => projectFixedDurationBars(aggregationInput({ bars: [{ ...sourceBars[0], startEpochMs: sourceBars[0].startEpochMs + 1 }] })),
  'invalid-envelope': () => projectFixedDurationBars(aggregationInput({ bars: [{ ...sourceBars[0], high: 98 }] })),
  'invalid-volume': () => projectFixedDurationBars(aggregationInput({ bars: [{ ...sourceBars[0], volume: -1 }] })),
  'volume-overflow': () => projectFixedDurationBars(aggregationInput({
    bars: [
      { ...sourceBars[0], volume: Number.MAX_VALUE },
      { ...sourceBars[1], volume: Number.MAX_VALUE },
    ],
  })),
  'negative-bucket': () => resolveFixedBucketStart({
    durationMs: 4 * 60 * MINUTE, offsetMs: 2 * 60 * MINUTE, sourceDurationMs: MINUTE, startEpochMs: 0,
  }),
  'missing-context': () => policy.project(sourceBars, null),
  'context-duration-mismatch': () => policy.project(sourceBars, context(policy, 15 * MINUTE)),
  'context-resolution-mismatch': () => policy.project(sourceBars, context(policy, 5 * MINUTE, 'resolution.other')),
  'stale-policy-id': () => projectPaneSnapshot(projectionInput({ aggregationPolicy: alternatePolicy })),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

const productionSources = fs.readdirSync(path.join(V7_ROOT, 'src/fixed-timeframe-domain'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/fixed-timeframe-domain', file), 'utf8'));
assert.deepEqual(
  productionSources.flatMap(findConcreteCapabilityIdBranches),
  [],
  'fixed timeframe policies must not branch on concrete capability ids',
);

console.log(`fixed-timeframe-domain-harness: PASS (${negativeCases.length} negative controls)`);
