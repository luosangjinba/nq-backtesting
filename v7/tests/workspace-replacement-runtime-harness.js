import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createRawBarBatch, createRawBarRequest } from '../src/bar-data-contract/public.js';
import {
  defineInstrument,
  defineTimeframe,
  defineTradingCalendar,
} from '../src/capability-contract/public.js';
import { createVisibleCompletionAcknowledgement } from '../src/chart-snapshot-application/public.js';
import { createFixedDurationAggregationPolicy } from '../src/fixed-timeframe-domain/public.js';
import { projectPaneSnapshot } from '../src/projection-domain/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionHoursCalendar, createSessionHoursPolicy } from '../src/session-hours-domain/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import {
  createWorkspaceReplacementCatalog,
  createWorkspaceReplacementExecutor,
  createWorkspaceReplacementInput,
} from '../src/workspace-replacement-runtime/public.js';
import { createWorkspaceTransactionRuntime } from '../src/workspace-transaction-runtime/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-replacement-runtime/negative/cases.json',
), 'utf8'));
const MINUTE = 60_000;
const epoch = (label) => Date.parse(`${label}:00Z`);
const sessionId = createSessionId('session-replacement');
const activationGeneration = createActivationGeneration(1);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function base(kind, contract, id, label = id) {
  return {
    apiVersion: 1,
    contract,
    display: { label, shortLabel: label },
    id,
    kind,
    schemaVersion: 1,
    version: '1.0.0',
  };
}

const IDS = Object.freeze({
  calendar: 'calendar.replacement-test',
  eth: 'session-hours.replacement-eth',
  identity: 'projection.replacement-identity',
  instrument: 'instrument.replacement-test',
  fixedHour: 'projection.replacement-fixed-hour',
  oneHour: 'timeframe.replacement-one-hour',
  oneMinute: 'timeframe.replacement-one-minute',
  provider: 'provider.replacement-test',
  resolution: 'resolution.replacement-one-minute',
  rth: 'session-hours.replacement-rth',
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
  alignmentPolicyIds: ['alignment.fixed-duration'],
  revision: 'calendar-replacement-r1',
  sessionHoursPolicyIds: [IDS.eth, IDS.rth],
  timeZone: 'America/New_York',
});
const oneMinute = defineTimeframe({
  ...base('timeframe', 'TimeframeDefinition', IDS.oneMinute, '1m'),
  aggregationPolicyId: IDS.identity,
  alignment: { durationMs: MINUTE, kind: 'fixed-duration' },
  sourceResolutionIds: [IDS.resolution],
});
const oneHour = defineTimeframe({
  ...base('timeframe', 'TimeframeDefinition', IDS.oneHour, '1h'),
  aggregationPolicyId: IDS.fixedHour,
  alignment: { durationMs: 60 * MINUTE, kind: 'fixed-duration' },
  sourceResolutionIds: [IDS.resolution],
});
const closed = () => [];
const intervals = (startMinute, endMinute) => [{ startMinute, endMinute }];
const sessionCalendar = createSessionHoursCalendar({
  schemaVersion: 1,
  exceptions: [],
  revision: calendar.revision,
  supportedInstrumentIds: [IDS.instrument],
  wallClockEncoding: 'exchange-wall-clock-utc-like',
  weeklySchedule: {
    eth: [
      intervals(1080, 1440),
      [{ startMinute: 0, endMinute: 1020 }, { startMinute: 1080, endMinute: 1440 }],
      [{ startMinute: 0, endMinute: 1020 }, { startMinute: 1080, endMinute: 1440 }],
      [{ startMinute: 0, endMinute: 1020 }, { startMinute: 1080, endMinute: 1440 }],
      [{ startMinute: 0, endMinute: 1020 }, { startMinute: 1080, endMinute: 1440 }],
      intervals(0, 1020),
      closed(),
    ],
    rth: [closed(), ...Array.from({ length: 5 }, () => intervals(570, 975)), closed()],
  },
});
const sessionPolicies = Object.freeze({
  eth: createSessionHoursPolicy({ calendar: sessionCalendar, id: IDS.eth, mode: 'eth' }),
  rth: createSessionHoursPolicy({ calendar: sessionCalendar, id: IDS.rth, mode: 'rth' }),
});
const identityPolicies = Object.freeze(Object.fromEntries(['eth', 'rth'].map((mode) => [mode, Object.freeze({
  deterministic: true,
  id: IDS.identity,
  project: (bars) => bars,
  revision: `identity-${mode}-r1`,
})])));
const hourPolicies = Object.freeze({
  eth: createFixedDurationAggregationPolicy({
    schemaVersion: 1, durationMs: 60 * MINUTE, id: IDS.fixedHour,
    offsetMs: 0, revision: 'fixed-hour-eth-r1', sourceDurationMs: MINUTE,
  }),
  rth: createFixedDurationAggregationPolicy({
    schemaVersion: 1, durationMs: 60 * MINUTE, id: IDS.fixedHour,
    offsetMs: 30 * MINUTE, revision: 'fixed-hour-rth-r1', sourceDurationMs: MINUTE,
  }),
});

function entry(displayTimeframe, mode, aggregationPolicy, overrides = {}) {
  return {
    aggregationPolicy,
    calendar,
    displayTimeframe,
    instrument,
    paneId: 'pane-main',
    sessionHoursMode: mode,
    sessionHoursPolicy: sessionPolicies[mode],
    ...overrides,
  };
}

const entries = [
  entry(oneMinute, 'eth', identityPolicies.eth),
  entry(oneMinute, 'rth', identityPolicies.rth),
  entry(oneHour, 'eth', hourPolicies.eth),
  entry(oneHour, 'rth', hourPolicies.rth),
];
const catalog = createWorkspaceReplacementCatalog(entries);
const request = createRawBarRequest({
  datasetRevision: 'replacement-dataset-r1',
  instrumentId: IDS.instrument,
  providerId: IDS.provider,
  schemaVersion: 1,
  sourceResolutionId: IDS.resolution,
  windowStartEpochMs: epoch('2026-06-08T09:00'),
  windowEndEpochMs: epoch('2026-06-09T03:01'),
});

function bar(label, index) {
  return {
    startEpochMs: epoch(label),
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 10 + index,
  };
}

const batch = createRawBarBatch({
  schemaVersion: 1,
  request,
  bars: [
    bar('2026-06-08T09:30', 0),
    bar('2026-06-08T09:31', 1),
    bar('2026-06-08T10:00', 2),
    bar('2026-06-08T15:59', 3),
    bar('2026-06-08T16:13', 4),
    bar('2026-06-08T16:14', 5),
    bar('2026-06-08T18:00', 6),
    bar('2026-06-09T00:00', 7),
    bar('2026-06-09T03:00', 8),
  ],
});
const cursorEpochMs = epoch('2026-06-09T03:01');
const replay = createReplayRuntime({
  activationGeneration,
  initialCursorEpochMs: cursorEpochMs,
  range: { startEpochMs: request.windowStartEpochMs, endEpochMs: epoch('2026-06-09T18:00') },
  sessionId,
});
let acquireFailureKey = null;
let acquireGate = null;
let acquireGateKey = null;
let presentGate = null;
let presentGateKey = null;
let visibleSnapshot = null;
const selectionKey = (selection) => `${selection.sessionHoursMode}/${selection.displayTimeframe.id}`;

const transactionRuntime = createWorkspaceTransactionRuntime({
  activationGeneration,
  acquisitionPort: Object.freeze({
    async acquire({ input }) {
      const targetKey = selectionKey(input.selection);
      if (targetKey === acquireFailureKey) throw Object.assign(new Error('acquisition failed'), { code: 'replacement-acquisition-failed' });
      if (targetKey === acquireGateKey) await acquireGate.promise;
      return batch;
    },
  }),
  projectionPort: Object.freeze({
    async project({ acquired, input, proposal }) {
      const selected = input.selection;
      return projectPaneSnapshot({
        aggregationPolicy: selected.aggregationPolicy,
        calendar: selected.calendar,
        cursorProposal: proposal,
        displayTimeframe: selected.displayTimeframe,
        instrument: selected.instrument,
        paneId: selected.paneId,
        schemaVersion: 1,
        sessionHoursPolicy: selected.sessionHoursPolicy,
        sourceBatches: [acquired],
      });
    },
  }),
  replayPort: Object.freeze({
    commitVisible(proposal, workspaceSnapshot) {
      return replay.commitVisible(proposal, {
        visibleThroughEpochMs: workspaceSnapshot.provenance.visibleThroughEpochMs,
      });
    },
    propose: ({ identity }) => replay.proposeRetention({ identity }),
    reject: (proposal) => replay.reject(proposal),
  }),
  sessionId,
  visibleCompletionPort: Object.freeze({
    async present(context) {
      const targetKey = `${context.workspaceSnapshot.provenance.sessionHoursMode}/${context.workspaceSnapshot.provenance.displayTimeframeId}`;
      if (targetKey === presentGateKey) await presentGate.promise;
      if (context.signal.aborted) throw Object.assign(new Error('presentation stale'), { code: 'replacement-presentation-stale' });
      visibleSnapshot = context.workspaceSnapshot;
      return createVisibleCompletionAcknowledgement({
        identity: context.identity,
        workspaceSnapshot: context.workspaceSnapshot,
      });
    },
  }),
});
const executor = createWorkspaceReplacementExecutor({ catalog, transactionRuntime });
let sequence = 0;

function intent(operation = 'session-hours-replacement') {
  return createWorkspaceTransactionIntent({
    identity: createWorkspaceTransactionIdentity({
      activationGeneration,
      sessionId,
      transactionId: createTransactionId(`replacement-${++sequence}`),
    }),
    operation,
  });
}

function target(timeframeId, sessionHoursMode) {
  return { instrumentId: IDS.instrument, sessionHoursMode, timeframeId };
}

async function replace(timeframeId, sessionHoursMode, operation = 'session-hours-replacement') {
  return describeWorkspaceTransactionEnvelope(await executor.execute({
    intent: intent(operation),
    request,
    target: target(timeframeId, sessionHoursMode),
  }));
}

assert.equal((await replace(IDS.oneMinute, 'eth')).status, 'committed');
assert.equal(replay.snapshot().cursorEpochMs, cursorEpochMs);
assert.equal(replay.snapshot().visibleThroughEpochMs, epoch('2026-06-09T03:00'));
assert.equal(visibleSnapshot.provenance.sessionHoursMode, 'eth');
assert.equal(visibleSnapshot.bars.at(-1).startEpochMs, epoch('2026-06-09T03:00'));

assert.equal((await replace(IDS.oneMinute, 'rth')).status, 'committed');
assert.equal(replay.snapshot().cursorEpochMs, cursorEpochMs, 'Session Hours replacement retains cursor');
assert.equal(replay.snapshot().visibleThroughEpochMs, epoch('2026-06-08T16:14'));
assert.equal(visibleSnapshot.provenance.sessionHoursMode, 'rth');
assert.equal(visibleSnapshot.bars.some((candidate) => candidate.startEpochMs >= epoch('2026-06-08T18:00')), false);

assert.equal((await replace(IDS.oneHour, 'rth', 'timeframe-replacement')).status, 'committed');
assert.equal(visibleSnapshot.bars.at(-1).startEpochMs, epoch('2026-06-08T15:30'));
assert.equal(visibleSnapshot.provenance.visibleThroughEpochMs, epoch('2026-06-08T16:14'));
const acceptedBeforeFailure = transactionRuntime.snapshot().acceptedSnapshot;
const replayBeforeFailure = replay.snapshot();
const visibleBeforeFailure = visibleSnapshot;
acquireFailureKey = `eth/${IDS.oneHour}`;
assert.equal((await replace(IDS.oneHour, 'eth', 'timeframe-replacement')).status, 'failed');
acquireFailureKey = null;
assert.equal(transactionRuntime.snapshot().acceptedSnapshot, acceptedBeforeFailure);
assert.equal(visibleSnapshot, visibleBeforeFailure);
assert.deepEqual(replay.snapshot(), replayBeforeFailure);

acquireGate = deferred();
acquireGateKey = `eth/${IDS.oneHour}`;
const slowAcquisition = replace(IDS.oneHour, 'eth', 'timeframe-replacement');
await Promise.resolve();
assert.equal((await replace(IDS.oneMinute, 'rth')).status, 'committed');
acquireGate.resolve();
assert.equal((await slowAcquisition).status, 'stale');
assert.equal(visibleSnapshot.provenance.sessionHoursMode, 'rth');
assert.equal(visibleSnapshot.provenance.displayTimeframeId, IDS.oneMinute);
acquireGateKey = null;

presentGate = deferred();
presentGateKey = `eth/${IDS.oneHour}`;
const slowPresentation = replace(IDS.oneHour, 'eth', 'timeframe-replacement');
await Promise.resolve();
await Promise.resolve();
assert.equal((await replace(IDS.oneMinute, 'rth')).status, 'committed');
presentGate.resolve();
assert.equal((await slowPresentation).status, 'stale');
assert.equal(visibleSnapshot.provenance.sessionHoursMode, 'rth');
assert.equal(replay.snapshot().cursorEpochMs, cursorEpochMs);
presentGateKey = null;

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

const badRequest = (overrides) => ({ ...request, ...overrides });
const replacementIntent = intent('timeframe-replacement');
const negativeActions = {
  'empty-catalog': () => createWorkspaceReplacementCatalog([]),
  'duplicate-entry': () => createWorkspaceReplacementCatalog([entries[0], entries[0]]),
  'incompatible-entry': () => createWorkspaceReplacementCatalog([
    entry(oneMinute, 'eth', identityPolicies.eth, { sessionHoursPolicy: sessionPolicies.rth }),
  ]),
  'mutable-policy': () => createWorkspaceReplacementCatalog([
    entry(oneMinute, 'eth', { ...identityPolicies.eth }),
  ]),
  'undeclared-target': () => createWorkspaceReplacementInput({
    catalog, request, target: target('timeframe.missing', 'eth'),
  }),
  'request-instrument-mismatch': () => createWorkspaceReplacementInput({
    catalog, request: badRequest({ instrumentId: 'instrument.other' }), target: target(IDS.oneMinute, 'eth'),
  }),
  'request-provider-mismatch': () => createWorkspaceReplacementInput({
    catalog, request: badRequest({ providerId: 'provider.other' }), target: target(IDS.oneMinute, 'eth'),
  }),
  'request-resolution-mismatch': () => createWorkspaceReplacementInput({
    catalog, request: badRequest({ sourceResolutionId: 'resolution.other' }), target: target(IDS.oneMinute, 'eth'),
  }),
  'invalid-operation': () => executor.execute({
    intent: intent('manual-next'), request, target: target(IDS.oneMinute, 'eth'),
  }),
  'unknown-execution-field': () => executor.execute({
    intent: replacementIntent, request, target: target(IDS.oneMinute, 'eth'), legacy: true,
  }),
  'invalid-transaction-port': () => createWorkspaceReplacementExecutor({ catalog, transactionRuntime: {} }),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

const productionSources = fs.readdirSync(path.join(V7_ROOT, 'src/workspace-replacement-runtime'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/workspace-replacement-runtime', file), 'utf8'));
assert.deepEqual(
  productionSources.flatMap(findConcreteCapabilityIdBranches),
  [],
  'workspace replacement routing must not branch on concrete capability ids',
);

console.log(`workspace-replacement-runtime-harness: PASS (${negativeCases.length} negative controls, acquisition/presentation races)`);
