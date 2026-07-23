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
  projectPaneHistoryExtension,
  projectPaneReplayAdvance,
  projectPaneSnapshot,
} from '../src/projection-domain/public.js';
import { createReplayAdvanceInput, createReplayCursorProposal } from '../src/replay-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';
import { findConcreteCapabilityIdBranches } from './support/capability-source-validator.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/projection-domain/negative/cases.json',
), 'utf8'));

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
  aggregation: 'projection.identity',
  calendar: 'cme.equity-index',
  instrument: 'cme.nq',
  provider: 'local.v4-provider',
  resolution: 'fixed.1-minute',
  sessionHours: 'cme.eth',
  timeframe: 'display.1-minute',
});

function instrument(overrides = {}) {
  return defineInstrument({
    ...base('instrument', 'InstrumentDefinition', IDS.instrument),
    symbol: 'NQ',
    priceIncrement: '0.25',
    quantityIncrement: '1',
    exchangeTimeZone: 'America/New_York',
    calendarId: IDS.calendar,
    providerIds: [IDS.provider],
    ...overrides,
  });
}

function calendar(overrides = {}) {
  return defineTradingCalendar({
    ...base('calendar', 'TradingCalendar', IDS.calendar),
    timeZone: 'America/New_York',
    revision: 'cme-2026-r1',
    sessionHoursPolicyIds: [IDS.sessionHours],
    alignmentPolicyIds: ['alignment.fixed-duration'],
    ...overrides,
  });
}

function timeframe(overrides = {}) {
  return defineTimeframe({
    ...base('timeframe', 'TimeframeDefinition', IDS.timeframe),
    alignment: { kind: 'fixed-duration', durationMs: 60_000 },
    aggregationPolicyId: IDS.aggregation,
    sourceResolutionIds: [IDS.resolution],
    ...overrides,
  });
}

function bar(startEpochMs, overrides = {}) {
  const index = (startEpochMs - 1_000_000) / 60_000;
  return {
    startEpochMs,
    open: 20_000 + index,
    high: 20_002 + index,
    low: 19_999 + index,
    close: 20_001 + index,
    volume: 100 + index,
    ...overrides,
  };
}

function batch({
  bars = Array.from({ length: 8 }, (_, index) => bar(1_000_000 + (index * 60_000))),
  request = {},
} = {}) {
  return createRawBarBatch({
    schemaVersion: 1,
    request: {
      schemaVersion: 1,
      providerId: IDS.provider,
      instrumentId: IDS.instrument,
      sourceResolutionId: IDS.resolution,
      windowStartEpochMs: 1_000_000,
      windowEndEpochMs: 1_480_000,
      datasetRevision: 'duckdb-r1',
      ...request,
    },
    bars,
  });
}

const transactionIdentity = createWorkspaceTransactionIdentity({
  activationGeneration: createActivationGeneration(1),
  sessionId: createSessionId('session-projection'),
  transactionId: createTransactionId('transaction-projection'),
});
const proposal = createReplayCursorProposal({
  advance: createReplayAdvanceInput({ source: 'manual', durationMs: 180_000 }),
  baseRevision: 0,
  cursorEpochMs: 1_120_000,
  identity: transactionIdentity,
  range: { startEpochMs: 1_000_000, endEpochMs: 2_000_000 },
});

function policies({ aggregationId = IDS.aggregation, eligibility = () => true } = {}) {
  return {
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: aggregationId,
      project: (bars) => bars,
      revision: 'identity-r1',
    }),
    sessionHoursPolicy: Object.freeze({
      deterministic: true,
      id: IDS.sessionHours,
      isEligible: eligibility,
      mode: 'eth',
      revision: 'eth-r1',
    }),
  };
}

function projectionInput(overrides = {}) {
  return {
    schemaVersion: 1,
    paneId: 'pane-1',
    instrument: instrument(),
    calendar: calendar(),
    displayTimeframe: timeframe(),
    sourceBatches: [batch()],
    cursorProposal: proposal,
    ...policies(),
    ...overrides,
  };
}

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

const eligibilityCalls = [];
const accepted = projectPaneSnapshot(projectionInput({
  ...policies({ eligibility: (candidate) => {
    eligibilityCalls.push(candidate.startEpochMs);
    return true;
  } }),
}));
assert.deepEqual(
  accepted.bars.map((candidate) => candidate.startEpochMs),
  [1_000_000, 1_060_000, 1_120_000, 1_180_000, 1_240_000],
  'exclusive target must preserve every historical and intermediate 1m bar below the cursor',
);
assert.deepEqual(eligibilityCalls, accepted.bars.map((candidate) => candidate.startEpochMs));
assert.deepEqual(
  accepted.bars.map((candidate) => candidate.displayEpochMs),
  accepted.bars.map((candidate) => candidate.startEpochMs),
  'identity 1m projection must canonicalize display time to source start',
);
assert.equal(accepted.bars.some((candidate) => candidate.startEpochMs === 1_300_000), false);
assert.equal(accepted.provenance.instrumentId, IDS.instrument);
assert.equal(accepted.provenance.instrumentVersion, '1.0.0');
assert.equal(accepted.provenance.sourceResolutionId, IDS.resolution);
assert.equal(accepted.provenance.displayTimeframeId, IDS.timeframe);
assert.equal(accepted.provenance.displayTimeframeDurationMs, 60_000);
assert.equal(accepted.provenance.sessionHoursPolicyId, IDS.sessionHours);
assert.equal(accepted.provenance.sessionHoursPolicyRevision, 'eth-r1');
assert.equal(accepted.provenance.sessionHoursMode, 'eth');
assert.equal(accepted.provenance.visibleThroughEpochMs, 1_240_000);
assert.equal(accepted.provenance.aggregationPolicyRevision, 'identity-r1');
assert.equal(accepted.provenance.calendarRevision, 'cme-2026-r1');
assert.equal(accepted.provenance.calendarVersion, '1.0.0');
assert.equal(accepted.provenance.cursorProposal, proposal);
assertDeepFrozen(accepted);
assert.deepEqual(projectPaneSnapshot(projectionInput()), accepted, 'pure projection must be deterministic');

const nextProposal = createReplayCursorProposal({
  advance: createReplayAdvanceInput({ source: 'manual', durationMs: 60_000 }),
  baseRevision: 1,
  cursorEpochMs: 1_300_000,
  identity: transactionIdentity,
  range: { startEpochMs: 1_000_000, endEpochMs: 2_000_000 },
});
const advanceEligibilityCalls = [];
const advanceInput = projectionInput({
  cursorProposal: nextProposal,
  ...policies({ eligibility: (candidate) => {
    advanceEligibilityCalls.push(candidate.startEpochMs);
    return true;
  } }),
});
const advanced = projectPaneReplayAdvance({ ...advanceInput, acceptedSnapshot: accepted });
assert.deepEqual(advanced, projectPaneSnapshot(advanceInput),
  'incremental Replay projection must equal a complete projection at the same cursor');
assert.deepEqual(advanceEligibilityCalls, [1_240_000, 1_300_000,
  1_000_000, 1_060_000, 1_120_000, 1_180_000, 1_240_000, 1_300_000],
'Replay advance must evaluate only the accepted tail bucket before the full-equivalence control');
assertDeepFrozen(advanced);

let aggregationInput = null;
const eligibleBeforeAggregation = projectPaneSnapshot(projectionInput({
  sessionHoursPolicy: Object.freeze({
    deterministic: true,
    id: IDS.sessionHours,
    isEligible: (candidate) => candidate.startEpochMs !== 1_180_000,
    mode: 'eth',
    revision: 'eth-r1',
  }),
  aggregationPolicy: Object.freeze({
    deterministic: true,
    id: IDS.aggregation,
    project: (bars) => {
      aggregationInput = bars;
      return bars;
    },
    revision: 'identity-r1',
  }),
}));
assert.equal(aggregationInput.some((candidate) => candidate.startEpochMs === 1_180_000), false);
assert.equal(eligibleBeforeAggregation.bars.length, accepted.bars.length - 1);

const secondWindow = batch({
  bars: [bar(1_480_000), bar(1_540_000)],
  request: { windowStartEpochMs: 1_480_000, windowEndEpochMs: 1_600_000 },
});
const twoWindow = projectPaneSnapshot(projectionInput({ sourceBatches: [batch(), secondWindow] }));
assert.equal(twoWindow.provenance.sourceRequestKeys.length, 2);
assert.deepEqual(twoWindow.bars, accepted.bars, 'future cached chunks cannot cross Replay cutoff');

const earlierWindow = batch({
  bars: [bar(880_000), bar(940_000)],
  request: { windowStartEpochMs: 880_000, windowEndEpochMs: 1_000_000 },
});
const extended = projectPaneHistoryExtension({
  ...projectionInput({ sourceBatches: [earlierWindow, batch()] }),
  acceptedSnapshot: accepted,
  sourceRequestKeys: [earlierWindow.requestKey, ...accepted.provenance.sourceRequestKeys],
});
assert.deepEqual(extended.bars.map((candidate) => candidate.startEpochMs), [
  880_000, 940_000, 1_000_000, 1_060_000, 1_120_000, 1_180_000, 1_240_000,
]);
assert.equal(extended.provenance.visibleThroughEpochMs, accepted.provenance.visibleThroughEpochMs);
assert.deepEqual(extended.provenance.sourceRequestKeys, [
  earlierWindow.requestKey, ...accepted.provenance.sourceRequestKeys,
]);
assertDeepFrozen(extended);

const closedWindow = batch({
  bars: [bar(880_000), bar(940_000)],
  request: { windowStartEpochMs: 880_000, windowEndEpochMs: 1_000_000 },
});
const closedPolicies = policies({ eligibility: (candidate) => candidate.startEpochMs >= 1_000_000 });
const firstClosedExtension = projectPaneHistoryExtension({
  ...projectionInput({ sourceBatches: [closedWindow, batch()], ...closedPolicies }),
  acceptedSnapshot: accepted,
  sourceRequestKeys: [closedWindow.requestKey, ...accepted.provenance.sourceRequestKeys],
});
const earlierClosedWindow = batch({
  bars: [bar(760_000), bar(820_000)],
  request: { windowStartEpochMs: 760_000, windowEndEpochMs: 880_000 },
});
const nonContributingExtension = projectPaneHistoryExtension({
  ...projectionInput({ sourceBatches: [earlierClosedWindow, closedWindow], ...closedPolicies }),
  acceptedSnapshot: firstClosedExtension,
  sourceRequestKeys: [earlierClosedWindow.requestKey, ...firstClosedExtension.provenance.sourceRequestKeys],
});
assert.deepEqual(nonContributingExtension.bars, accepted.bars,
  'consecutive closed-session history windows must preserve the accepted visible tail');
assert.deepEqual(nonContributingExtension.provenance.sourceRequestKeys, [
  earlierClosedWindow.requestKey, closedWindow.requestKey, ...accepted.provenance.sourceRequestKeys,
], 'a non-contributing history window must still advance raw coverage');
assertDeepFrozen(nonContributingExtension);

function errorCode(action) {
  try {
    action();
    return null;
  } catch (error) {
    return error.code;
  }
}

assert.equal(errorCode(() => projectPaneHistoryExtension({
  ...projectionInput({
    sourceBatches: [earlierClosedWindow, closedWindow],
    ...closedPolicies,
    sessionHoursPolicy: Object.freeze({
      ...closedPolicies.sessionHoursPolicy,
      revision: 'eth-r2',
    }),
  }),
  acceptedSnapshot: firstClosedExtension,
  sourceRequestKeys: [earlierClosedWindow.requestKey, ...firstClosedExtension.provenance.sourceRequestKeys],
})), 'PROJECTION_HISTORY_SNAPSHOT_MISMATCH',
'non-contributing history must not conceal a changed Session Hours policy');
assert.equal(errorCode(() => projectPaneHistoryExtension({
  ...projectionInput({ sourceBatches: [earlierClosedWindow, closedWindow], ...closedPolicies }),
  acceptedSnapshot: firstClosedExtension,
  sourceRequestKeys: [earlierClosedWindow.requestKey, 'forged-request-key'],
})), 'PROJECTION_HISTORY_SOURCE_KEYS_INVALID',
'non-contributing history must still prove an exact contiguous request-key chain');

const laterBatch = () => batch({
  bars: [bar(1_480_000)],
  request: { windowStartEpochMs: 1_480_000, windowEndEpochMs: 1_600_000 },
});
const negativeActions = {
  'empty-batch-list': () => projectPaneSnapshot(projectionInput({ sourceBatches: [] })),
  'empty-source': () => projectPaneSnapshot(projectionInput({ sourceBatches: [batch({ bars: [] })] })),
  'unordered-windows': () => projectPaneSnapshot(projectionInput({ sourceBatches: [laterBatch(), batch()] })),
  'gapped-windows': () => projectPaneSnapshot(projectionInput({
    sourceBatches: [batch(), batch({
      bars: [bar(1_540_000)],
      request: { windowStartEpochMs: 1_540_000, windowEndEpochMs: 1_600_000 },
    })],
  })),
  'mixed-dataset': () => projectPaneSnapshot(projectionInput({
    sourceBatches: [batch(), batch({
      bars: [bar(1_480_000)],
      request: {
        windowStartEpochMs: 1_480_000,
        windowEndEpochMs: 1_600_000,
        datasetRevision: 'duckdb-r2',
      },
    })],
  })),
  'instrument-mismatch': () => projectPaneSnapshot(projectionInput({
    sourceBatches: [batch({ request: { instrumentId: 'cme.es' } })],
  })),
  'provider-mismatch': () => projectPaneSnapshot(projectionInput({
    instrument: instrument({ providerIds: ['local.other-provider'] }),
  })),
  'resolution-mismatch': () => projectPaneSnapshot(projectionInput({
    displayTimeframe: timeframe({ sourceResolutionIds: ['fixed.1-second'] }),
  })),
  'calendar-mismatch': () => projectPaneSnapshot(projectionInput({
    calendar: calendar({ id: 'cme.other-calendar' }),
  })),
  'session-policy-mismatch': () => projectPaneSnapshot(projectionInput({
    sessionHoursPolicy: Object.freeze({
      deterministic: true,
      id: 'cme.rth',
      isEligible: () => true,
      mode: 'rth',
      revision: 'rth-r1',
    }),
  })),
  'aggregation-policy-mismatch': () => projectPaneSnapshot(projectionInput({
    ...policies({ aggregationId: 'projection.other' }),
  })),
  'nondeterministic-policy': () => projectPaneSnapshot(projectionInput({
    aggregationPolicy: Object.freeze({
      deterministic: false,
      id: IDS.aggregation,
      project: (bars) => bars,
      revision: 'identity-r1',
    }),
  })),
  'invalid-eligibility-result': () => projectPaneSnapshot(projectionInput({
    ...policies({ eligibility: () => 'yes' }),
  })),
  'all-source-future': () => projectPaneSnapshot(projectionInput({
    sourceBatches: [batch({
      bars: [bar(1_300_000), bar(1_360_000)],
      request: { windowStartEpochMs: 1_300_000 },
    })],
  })),
  'future-output': () => projectPaneSnapshot(projectionInput({
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: IDS.aggregation,
      project: (bars) => [...bars, bar(1_300_000)],
      revision: 'identity-r1',
    }),
  })),
  'unordered-output': () => projectPaneSnapshot(projectionInput({
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: IDS.aggregation,
      project: (bars) => [...bars].reverse(),
      revision: 'identity-r1',
    }),
  })),
  'invalid-display-time': () => projectPaneSnapshot(projectionInput({
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: IDS.aggregation,
      project: (bars) => bars.map((candidate) => ({
        ...candidate, displayEpochMs: candidate.startEpochMs - 1,
      })),
      revision: 'identity-r1',
    }),
  })),
  'unordered-display-time': () => projectPaneSnapshot(projectionInput({
    aggregationPolicy: Object.freeze({
      deterministic: true,
      id: IDS.aggregation,
      project: (bars) => bars.map((candidate) => ({ ...candidate, displayEpochMs: 2_000_000 })),
      revision: 'identity-r1',
    }),
  })),
  'malformed-source-bar': () => projectPaneSnapshot(projectionInput({
    sourceBatches: [{
      schemaVersion: 1,
      request: batch().request,
      bars: [bar(1_000_000, { high: 19_000 })],
    }],
  })),
  'unknown-input-field': () => projectPaneSnapshot(projectionInput({ legacyCursor: 1_300_000 })),
};

for (const fixture of negativeCases) {
  assert.equal(errorCode(negativeActions[fixture.case]), fixture.expectedCode, fixture.case);
}

const projectionSources = fs.readdirSync(path.join(V7_ROOT, 'src/projection-domain'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/projection-domain', file), 'utf8'));
assert.deepEqual(
  projectionSources.flatMap(findConcreteCapabilityIdBranches),
  [],
  'Projection Domain must dispatch registered policies without concrete capability-id branches',
);

console.log(`v7 Projection Domain harness passed (${negativeCases.length} negative controls)`);
