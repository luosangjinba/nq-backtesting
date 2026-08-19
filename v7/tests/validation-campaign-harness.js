import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import nodeCrypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateOutcomeObservation,
  canonicalJson,
  createSeedDefinitions,
  sha256Canonical,
  sha256CanonicalSync,
  strictPortableValue,
  VALIDATION_CAMPAIGN_DOCUMENT_PREFIX,
  VALIDATION_CAMPAIGN_INDEX_KEY,
} from '../src/validation-study-domain/public.js';
import {
  createValidationCampaignPersistenceAdapter,
} from '../src/validation-campaign-persistence/public.js';
import {
  createValidationFvgEvidenceProvider,
} from '../src/validation-fvg-evidence/public.js';
import {
  createValidationSmaEvidenceProvider,
} from '../src/validation-sma-evidence/public.js';
import {
  createValidationCampaignAuditExporter,
} from '../src/validation-campaign-audit-export/public.js';
import {
  createValidationOutcomeWindowAdapter,
} from '../src/validation-outcome-window/public.js';
import {
  createValidationCampaignRuntime,
} from '../src/validation-campaign-runtime/public.js';
import {
  captureReplicatedEntries,
  isReplicatedStateKey,
} from '../src/server-state-sync/snapshot.js';
import { verifyProductionModuleAssembly } from './support/production-module-assembly.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const crypto = nodeCrypto.webcrypto;
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/validation-campaign/negative/cases.json',
), 'utf8')).cases;
const negativeResults = new Map();
const digest = (character) => `sha256:${character.repeat(64)}`;

function code(error) { return error?.code ?? error?.cause?.code; }

async function expectCode(name, work, expectedCode) {
  await assert.rejects(Promise.resolve().then(work), (error) => code(error) === expectedCode,
    `${name} must fail with ${expectedCode}`);
  negativeResults.set(name, expectedCode);
}

function storagePort(values = new Map(), hooks = {}) {
  let writeCount = 0;
  return Object.freeze({
    keys: () => Object.freeze([...values.keys()].sort()),
    read(key) {
      hooks.beforeRead?.(key);
      return values.get(key) ?? null;
    },
    remove(key) {
      hooks.beforeRemove?.(key);
      values.delete(key);
    },
    values,
    write(key, value) {
      writeCount += 1;
      hooks.beforeWrite?.({ key, value, writeCount });
      values.set(key, value);
    },
  });
}

function enumerableWebStorage(values) {
  return Object.freeze({
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  });
}

function uuidFactory() {
  let sequence = 0;
  return () => {
    sequence += 1;
    return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  };
}

const common = Object.freeze({
  cutoff: 60_000,
  datasetRevision: 'dataset-revision-h121',
  providerId: 'foundation.market-data',
  sessionId: 'session-h121',
  sessionRevision: 1,
  workspaceRevision: 1,
});
const mutableSource = { fvgRevision: 1, smaRevision: 1 };

function fvgObservation({ paneId }) {
  return Object.freeze({
    artifact: Object.freeze({
      acceptance: 'accepted',
      definition: Object.freeze({ packageId: 'first-party.fair-value-gap', semantic: 'manual-fvg' }),
      direction: 'bullish',
      evidenceBarStartEpochMs: Object.freeze([57_000, 58_000, 59_000]),
      id: 'artifact-fvg-h121',
      lowerPrice: 99,
      provenance: Object.freeze({ acceptedWorkspaceRevision: 1, recognitionSource: 'manual' }),
      revision: mutableSource.fvgRevision,
      status: 'active',
      typeId: 'imbalance.fvg',
      typeVersion: '1.0.0',
      upperPrice: 101,
    }),
    document: Object.freeze({ id: 'annotation:session-h121', revision: mutableSource.fvgRevision }),
    package: Object.freeze({
      generation: 1,
      packageId: 'first-party.fair-value-gap',
      packageVersion: '1.0.0',
      state: 'active',
    }),
    pane: Object.freeze({
      datasetRevision: common.datasetRevision,
      displayTimeframeId: 'timeframe.display-1-minute',
      instrumentId: 'instrument.cme.nq',
      latestEligibleBarStartEpochMs: 59_000,
      paneId,
      paneRevision: common.workspaceRevision,
      providerId: common.providerId,
      sessionHoursPolicyId: 'session-hours.cme-eth',
    }),
    replay: Object.freeze({ exclusiveCutoffEpochMs: common.cutoff }),
    session: Object.freeze({ id: common.sessionId, revision: common.sessionRevision }),
    workspace: Object.freeze({ revision: common.workspaceRevision }),
  });
}

function smaObservation({ workspacePaneId }) {
  const identity = Object.freeze({
    contributionId: 'moving-averages.sma-close',
    contributionVersion: '1.0.0',
    definitionId: 'moving-averages.sma.close',
    definitionVersion: '1.0.0',
    packageId: 'first-party.moving-averages',
    packageVersion: '1.0.0',
  });
  return Object.freeze({
    document: Object.freeze({ id: 'calculated-series:session-h121', revision: mutableSource.smaRevision }),
    frame: Object.freeze({
      identity: Object.freeze({
        inputDigest: digest('1'),
        replayVisibleThroughEpochMs: common.cutoff,
        workspaceStateRevision: common.workspaceRevision,
      }),
      projectionRevision: mutableSource.smaRevision,
      provenance: Object.freeze({ definitionDigest: digest('2'), formula: 'sma-close' }),
      state: 'ready',
    }),
    instance: Object.freeze({
      definitionRef: identity,
      effectiveSettings: Object.freeze({ length: 20 }),
      id: 'instance-sma-h121',
      revision: mutableSource.smaRevision,
      visibility: 'visible',
    }),
    package: Object.freeze({ generation: 1, runtimeState: 'active' }),
    pane: Object.freeze({
      close: 110,
      datasetRevision: common.datasetRevision,
      displayTimeframeId: 'timeframe.display-5-minute',
      instrumentId: 'instrument.cme.nq',
      latestEligibleBarStartEpochMs: 59_000,
      paneRevision: common.workspaceRevision,
      providerId: common.providerId,
      sessionHoursPolicyId: 'session-hours.cme-eth',
      workspacePaneId,
    }),
    point: Object.freeze({ displayEpochMs: 59_000, value: 100 }),
    session: Object.freeze({ id: common.sessionId, revision: common.sessionRevision }),
  });
}

function providers() {
  return Object.freeze([
    createValidationFvgEvidenceProvider({ crypto, readObservation: fvgObservation }),
    createValidationSmaEvidenceProvider({ crypto, readObservation: smaObservation }),
  ]);
}

function pathPlan(overrides = {}) {
  return Object.freeze({
    direction: 'long',
    horizonBars: 3,
    invalidationPrice: 95,
    referencePrice: 100,
    targetPrice: 105,
    ...overrides,
  });
}

async function outcomeAdapter(request) {
  return calculateOutcomeObservation({
    bars: [
      { close: 101, high: 103, low: 99, open: 100, startEpochMs: 60_000 },
      { close: 105, high: 106, low: 100, open: 101, startEpochMs: 61_000 },
    ],
    coverageProof: 'complete-window',
    crypto,
    datasetIdentity: { datasetId: 'dataset-h121', datasetRevision: common.datasetRevision },
    decisionCutoffEpochMs: request.decisionCutoffEpochMs,
    outcomeCutoffEpochMs: request.requestedOutcomeCutoffEpochMs,
    pathPlan: request.pathPlan,
    recordedAtEpochMs: request.recordedAtEpochMs,
  });
}

function createRuntimeFixture({ evidenceProviders = providers(), map = new Map(), nowStart = 1_000_000 } = {}) {
  let now = nowStart;
  const persistence = createValidationCampaignPersistenceAdapter({ storage: storagePort(map) });
  return Object.freeze({
    map,
    now: () => now,
    setNow: (value) => { now = value; },
    runtime: createValidationCampaignRuntime({
      auditExporter: createValidationCampaignAuditExporter({ crypto }),
      crypto,
      evidenceProviders,
      idFactory: uuidFactory(),
      nowEpochMs: () => now++,
      outcomeAdapter: Object.freeze({ observeOutcome: outcomeAdapter }),
      persistence,
    }),
  });
}

function createCommand(expectedIndexRevision = 0) {
  return Object.freeze({
    authorLabel: 'Local researcher',
    contextTimeframeId: 'timeframe.display-5-minute',
    direction: 'long',
    executionTimeframeId: 'timeframe.display-1-minute',
    expectedIndexRevision,
    instrumentId: 'instrument.cme.nq',
    kind: 'create-campaign',
    sessionHoursId: 'session-hours.cme-eth',
    title: 'FVG + SMA validation',
  });
}

function observationRequest(documentValue) {
  return Object.freeze({
    campaignId: documentValue.campaign.campaignId,
    contextPaneId: 'pane-main',
    executionPaneId: 'pane-secondary',
    expectedDocumentRevision: documentValue.documentRevision,
    fvgArtifactId: 'artifact-fvg-h121',
    outcomeDefinitionRef: documentValue.campaign.outcomeDefinitionRef,
    setupDefinitionRef: documentValue.campaign.setupDefinitionRef,
    smaInstanceId: 'instance-sma-h121',
  });
}

function commitCommand(documentValue, preview, overrides = {}) {
  return Object.freeze({
    authorLabel: 'Local researcher',
    campaignId: documentValue.campaign.campaignId,
    confidence: 80,
    explicitConfirmation: true,
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'commit-case-observation',
    notes: 'Qualified at the frozen decision cutoff.',
    outcomeDefinitionRef: documentValue.campaign.outcomeDefinitionRef,
    pathPlan: pathPlan(),
    previewToken: preview.previewToken,
    qualificationClass: 'qualified',
    setupDefinitionRef: documentValue.campaign.setupDefinitionRef,
    ...overrides,
  });
}

// Canonical JSON/digest equivalence and hostile-value rejection.
assert.equal(canonicalJson({ z: 1, a: ['é', -0] }), '{"a":["é",0],"z":1}');
assert.equal(
  await sha256Canonical({ z: 1, a: ['é', -0] }, crypto),
  sha256CanonicalSync({ z: 1, a: ['é', -0] }),
);
const hostile = {};
Object.defineProperty(hostile, 'secret', { enumerable: true, get: () => 'leak' });
await expectCode('hostile-accessor', () => strictPortableValue(hostile),
  'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT');
for (const value of [NaN, Infinity, ['hole', , 'value'], '\ud800', 'e\u0301']) {
  assert.throws(() => strictPortableValue(value));
}

// Exact deterministic Outcome matrix, including no inferred same-Bar order.
const outcomeBase = {
  coverageProof: 'complete-window', crypto,
  datasetIdentity: { datasetId: 'dataset-h121', datasetRevision: 'revision-1' },
  decisionCutoffEpochMs: 1_000,
  outcomeCutoffEpochMs: 10_000,
  pathPlan: pathPlan(),
  recordedAtEpochMs: 11_000,
};
const target = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 105, high: 106, low: 99, open: 100, startEpochMs: 1_000 }],
});
assert.equal(target.outcomeClass, 'target-first');
assert.equal(target.mfePoints, 6);
assert.equal(target.maePoints, 1);
const invalidation = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 96, high: 102, low: 94, open: 100, startEpochMs: 1_000 }],
});
assert.equal(invalidation.outcomeClass, 'invalidation-first');
const ambiguous = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 100, high: 106, low: 94, open: 100, startEpochMs: 1_000 }],
});
assert.equal(ambiguous.outcomeClass, 'same-bar-ambiguous');
assert.equal(ambiguous.timeToFirstTouchBars, null);
const expired = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [
    { close: 101, high: 102, low: 99, open: 100, startEpochMs: 1_000 },
    { close: 102, high: 103, low: 100, open: 101, startEpochMs: 2_000 },
    { close: 101, high: 103, low: 99, open: 102, startEpochMs: 3_000 },
  ],
});
assert.equal(expired.outcomeClass, 'horizon-expired');
const incomplete = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 101, high: 102, low: 99, open: 100, startEpochMs: 1_000 }],
  coverageProof: 'irrecoverable-incomplete',
});
assert.equal(incomplete.outcomeClass, 'incomplete-data');
assert.equal(incomplete.mfePoints, null);
await expectCode('outcome-not-revealed', () => calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 101, high: 102, low: 99, open: 100, startEpochMs: 1_000 }],
  coverageProof: 'not-yet-revealed',
}), 'VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED');
await expectCode('outcome-resource-limit', () => calculateOutcomeObservation({
  ...outcomeBase,
  bars: Array.from({ length: 2_001 }, (_, index) => ({
    close: 100, high: 101, low: 99, open: 100, startEpochMs: 1_000 + index,
  })),
}), 'VALIDATION_CAMPAIGN_RESOURCE_LIMIT');
const shortOutcome = await calculateOutcomeObservation({
  ...outcomeBase,
  bars: [{ close: 94, high: 102, low: 93, open: 100, startEpochMs: 1_000 }],
  pathPlan: pathPlan({ direction: 'short', invalidationPrice: 105, targetPrice: 95 }),
});
assert.equal(shortOutcome.outcomeClass, 'target-first');
assert.equal(shortOutcome.mfePoints, 7);
assert.equal(shortOutcome.maePoints, 2);

// The production Outcome adapter reads only Replay-revealed, Bar Data-owned accepted Bars.
const outcomeWindow = createValidationOutcomeWindowAdapter({
  barData: Object.freeze({
    async acquire(request) {
      return Object.freeze({ request: Object.freeze({
        datasetRevision: common.datasetRevision,
        instrumentId: request.instrumentId,
        providerId: common.providerId,
        sourceResolutionId: 'resolution-h121',
      }) });
    },
  }),
  crypto,
  market: Object.freeze({
    requestWindow({ instrumentId, windowEndEpochMs, windowStartEpochMs }) {
      return Object.freeze({ instrumentId, windowEndEpochMs, windowStartEpochMs });
    },
  }),
  readReplaySnapshot: () => Object.freeze({ cursorEpochMs: 64_000 }),
  readWorkspaceSnapshot: () => Object.freeze({ workspace: Object.freeze({ panes: Object.freeze([{
    paneId: 'pane-secondary',
    snapshot: Object.freeze({
      bars: Object.freeze([
        Object.freeze({ close: 101, high: 103, low: 99, open: 100, startEpochMs: 60_000 }),
        Object.freeze({ close: 105, high: 106, low: 100, open: 101, startEpochMs: 61_000 }),
        Object.freeze({ close: 104, high: 105, low: 103, open: 105, startEpochMs: 62_000 }),
      ]),
      provenance: Object.freeze({
        displayTimeframeId: 'timeframe.display-1-minute',
        instrumentId: common.instrumentId ?? 'instrument.cme.nq',
        sessionHoursPolicyId: 'session-hours.cme-eth',
      }),
    }),
    status: 'ready',
  }]) }) }),
  sessionRange: Object.freeze({ endEpochMs: 100_000 }),
});
const adaptedOutcome = await outcomeWindow.observeOutcome(Object.freeze({
  decisionCutoffEpochMs: 60_000,
  executionPaneId: 'pane-secondary',
  executionTimeframeId: 'timeframe.display-1-minute',
  instrumentId: 'instrument.cme.nq',
  pathPlan: pathPlan(),
  recordedAtEpochMs: 65_000,
  requestedOutcomeCutoffEpochMs: 63_000,
  sessionHoursId: 'session-hours.cme-eth',
}));
assert.equal(adaptedOutcome.outcomeClass, 'target-first');

// Runtime: source change writes zero bytes, then full Campaign -> Analysis closure.
mutableSource.fvgRevision = 1;
mutableSource.smaRevision = 1;
const fixture = createRuntimeFixture();
const runtime = await fixture.runtime;
const created = await runtime.execute(createCommand());
assert.equal(created.kind, 'create-campaign');
const campaignId = created.campaignId;
let documentValue = runtime.getCampaign(campaignId);
const beforeUnknown = new Map(fixture.map);
await expectCode('unknown-command-field', () => runtime.execute({
  ...createCommand(1), unexpected: true,
}), 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT');
assert.deepEqual(fixture.map, beforeUnknown);
await expectCode('stale-document', () => runtime.prepareCaseObservation({
  ...observationRequest(documentValue), expectedDocumentRevision: 99,
}), 'VALIDATION_CAMPAIGN_REVISION_STALE');

let preview = await runtime.prepareCaseObservation(observationRequest(documentValue));
assert.equal(preview.sharedContext.exclusiveReplayCutoffEpochMs, common.cutoff);
assert.deepEqual(preview.predicateResults.map(({ passed }) => passed), [true, true]);
const beforeChanged = new Map(fixture.map);
mutableSource.fvgRevision = 2;
await expectCode('source-changed', () => runtime.execute(commitCommand(documentValue, preview)),
  'VALIDATION_CAMPAIGN_SOURCE_CHANGED');
assert.deepEqual(fixture.map, beforeChanged);
preview = await runtime.prepareCaseObservation(observationRequest(documentValue));

await expectCode('notes-resource-limit', () => runtime.execute(commitCommand(documentValue, preview, {
  notes: 'x'.repeat(2_001),
})), 'VALIDATION_CAMPAIGN_RESOURCE_LIMIT');
assert.equal(runtime.getCampaign(campaignId).documentRevision, 1);
const commit = await runtime.execute(commitCommand(documentValue, preview));
assert.equal(commit.kind, 'commit-case-observation');
documentValue = runtime.getCampaign(campaignId);
const observed = runtime.readCase(campaignId, commit.caseId, commit.caseRevision);
assert.equal(observed.lifecycleState, 'observation-recorded');
assert.equal(observed.evidenceCitations.length, 2);
const citationJson = canonicalJson(observed.evidenceCitations);
for (const forbidden of [
  '"bars":[', '"series":[', '"open":', '"volume":', 'screenshot', 'canvas',
  'filesystem', 'http://', 'https://', 'privateHandle',
]) assert.equal(citationJson.toLowerCase().includes(forbidden.toLowerCase()), false);

const outcome = await runtime.execute({
  campaignId, caseId: observed.caseId, caseRevision: observed.caseRevision,
  expectedDocumentRevision: documentValue.documentRevision,
  kind: 'record-case-outcome', outcomeCutoffEpochMs: 63_000,
});
assert.equal(outcome.outcomeClass, 'target-first');
documentValue = runtime.getCampaign(campaignId);
const outcomeCase = runtime.readCase(campaignId, observed.caseId, outcome.caseRevision);
await runtime.execute({
  campaignId, caseId: outcomeCase.caseId, caseRevision: outcomeCase.caseRevision,
  expectedDocumentRevision: documentValue.documentRevision, kind: 'finalize-case',
});
documentValue = runtime.getCampaign(campaignId);
const finalized = runtime.readCase(campaignId, observed.caseId);
assert.equal(finalized.lifecycleState, 'finalized');
assert.equal(finalized.createdAtEpochMs, observed.createdAtEpochMs);

const cohortResult = await runtime.execute({
  authorLabel: 'Local researcher', campaignId, excludedCaseRefs: [],
  expectedDocumentRevision: documentValue.documentRevision, kind: 'freeze-cohort',
  manualOverrideReasons: [],
  memberCaseRefs: [{
    caseContentDigest: finalized.contentDigest,
    caseId: finalized.caseId,
    caseRevision: finalized.caseRevision,
  }],
  name: 'First frozen cohort', parentCohortRef: null,
});
documentValue = runtime.getCampaign(campaignId);
const cohort = documentValue.cohorts.find(({ cohortId }) => cohortId === cohortResult.cohortId);
const analysisResult = await runtime.execute({
  authorLabel: 'Local researcher', campaignId,
  cohortRef: {
    cohortContentDigest: cohort.contentDigest,
    cohortId: cohort.cohortId,
    cohortRevision: cohort.cohortRevision,
  },
  expectedDocumentRevision: documentValue.documentRevision,
  kind: 'run-analysis',
});
documentValue = runtime.getCampaign(campaignId);
const analysis = documentValue.analysisRuns.find(({ analysisRunId }) => (
  analysisRunId === analysisResult.analysisRunId
));
assert.equal(analysis.counts.total, 1);
assert.equal(analysis.rates.targetFirstRate.value, 1);
assert.equal(runtime.readAnalysisDrilldown(
  campaignId, analysis.analysisRunId, 'rate.target-first',
).caseRefs[0].caseRevision, finalized.caseRevision);

const rawContext = runtime.prepareRawContextIntent({
  campaignId, caseId: finalized.caseId, caseRevision: finalized.caseRevision,
  contextRole: 'observation',
});
assert.equal(rawContext instanceof Promise, false);
assert.equal(rawContext.sessionId, common.sessionId);
assert.equal(rawContext.paneIntents.length, 2);
const auditOne = await runtime.prepareAuditExport(campaignId);
const auditTwo = await runtime.prepareAuditExport(campaignId);
assert.equal(canonicalJson(auditOne), canonicalJson(auditTwo));
assert.equal(auditOne.omissions.includes('raw-bars'), true);
assert.equal(canonicalJson(auditOne).includes('https://'), false);

// Missing providers block new complete writes, but stored history/analysis/export stay readable.
runtime.dispose();
const absentFixture = createRuntimeFixture({ evidenceProviders: [], map: fixture.map });
const absentRuntime = await absentFixture.runtime;
assert.equal(absentRuntime.getCampaign(campaignId).analysisRuns[0].contentDigest, analysis.contentDigest);
assert.equal((await absentRuntime.prepareAuditExport(campaignId)).payloadDigest, auditOne.payloadDigest);
const unavailablePreview = await absentRuntime.prepareCaseObservation(
  observationRequest(absentRuntime.getCampaign(campaignId)),
);
assert.equal(unavailablePreview.sharedContext, null);
await expectCode('provider-absent', () => absentRuntime.execute(commitCommand(
  absentRuntime.getCampaign(campaignId), unavailablePreview,
)), 'VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE');
absentRuntime.dispose();

// Preview expiry is deterministic and writes nothing.
const expiryFixture = createRuntimeFixture({ nowStart: 2_000_000 });
const expiryRuntime = await expiryFixture.runtime;
const expiryCreated = await expiryRuntime.execute(createCommand());
const expiryDocument = expiryRuntime.getCampaign(expiryCreated.campaignId);
const expiryPreview = await expiryRuntime.prepareCaseObservation(observationRequest(expiryDocument));
expiryFixture.setNow(expiryPreview.expiresAtEpochMs + 1);
await expectCode('expired-preview', () => expiryRuntime.execute(commitCommand(
  expiryDocument, expiryPreview,
)), 'VALIDATION_CAMPAIGN_PREPARATION_EXPIRED');
assert.equal(expiryRuntime.getCampaign(expiryCreated.campaignId).documentRevision, 1);
expiryRuntime.dispose();

// Persistence CAS, reverse rollback, orphan, and corrupt diagnostics.
const casMap = new Map([['v7.validation-campaign:index', 'prior']]);
const casAdapter = createValidationCampaignPersistenceAdapter({ storage: storagePort(casMap) });
await expectCode('persistence-cas', () => casAdapter.prepare({ writes: [{
  expectedRaw: 'stale', key: VALIDATION_CAMPAIGN_INDEX_KEY, payload: { value: 1 },
}] }), 'VALIDATION_CAMPAIGN_PERSISTENCE_CAS_STALE');
const failureMap = new Map();
const failureStorage = storagePort(failureMap, {
  beforeWrite({ writeCount }) { if (writeCount === 2) throw new Error('Injected second write failure.'); },
});
const failureAdapter = createValidationCampaignPersistenceAdapter({ storage: failureStorage });
const failurePreparation = failureAdapter.prepare({ writes: [
  { expectedRaw: null, key: `${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}00000000-0000-4000-8000-000000000099`, payload: { value: 1 } },
  { expectedRaw: null, key: VALIDATION_CAMPAIGN_INDEX_KEY, payload: { value: 2 } },
] });
await expectCode('persistence-apply-rollback', () => failureAdapter.apply(failurePreparation),
  'VALIDATION_CAMPAIGN_PERSISTENCE_WRITE_FAILED');
assert.equal(failureMap.size, 0);
const orphanMap = new Map([[
  `${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}00000000-0000-4000-8000-000000000099`, '{}',
]]);
assert.equal(createValidationCampaignPersistenceAdapter({
  storage: storagePort(orphanMap),
}).restore().status, 'corrupt');
negativeResults.set('orphan-document', 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT');
const corruptMap = new Map([[VALIDATION_CAMPAIGN_INDEX_KEY, '{not-json']]);
assert.equal(createValidationCampaignPersistenceAdapter({
  storage: storagePort(corruptMap),
}).restore().status, 'corrupt');
negativeResults.set('corrupt-document', 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT');

// Existing whole-snapshot state sync captures only exact Campaign key/prefix additions.
assert.equal(isReplicatedStateKey(VALIDATION_CAMPAIGN_INDEX_KEY), true);
assert.equal(isReplicatedStateKey(`${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}${campaignId}`), true);
assert.equal(isReplicatedStateKey('v7.validation-campaign:document:'), false);
const replicated = captureReplicatedEntries(enumerableWebStorage(new Map([
  [VALIDATION_CAMPAIGN_INDEX_KEY, 'index'],
  [`${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}${campaignId}`, 'document'],
  ['v7.validation-campaign:private', 'forbidden'],
])));
assert.deepEqual(replicated.map(({ key }) => key), [
  `${VALIDATION_CAMPAIGN_DOCUMENT_PREFIX}${campaignId}`,
  VALIDATION_CAMPAIGN_INDEX_KEY,
].sort());

// Exact eight removable descriptors and governance state; H117 remains untouched.
const manifest = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'), 'utf8'));
const validationDescriptors = manifest.activeProductionModules.filter((entry) => (
  /validation-(?:study|campaign|fvg|sma|outcome)/u.test(entry)
));
assert.equal(validationDescriptors.length, 8);
const descriptors = validationDescriptors.map((entry) => JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, entry), 'utf8',
)));
assert.equal(descriptors.every(({ removable, version }) => removable && version === '1.0.0'), true);
assert.deepEqual(descriptors.map(({ id }) => id).sort(), [
  'adapter.validation-campaign-audit-export',
  'adapter.validation-campaign-persistence',
  'adapter.validation-campaign-ui',
  'adapter.validation-fvg-evidence',
  'adapter.validation-outcome-window',
  'adapter.validation-sma-evidence',
  'optional.validation-campaign-runtime',
  'optional.validation-study-domain',
]);
const productionAssembly = await verifyProductionModuleAssembly({ manifest, v7Root: V7_ROOT });
const removableFromApplication = new Set(productionAssembly.optionalRemovalMatrix
  .filter(({ consumerModuleId }) => consumerModuleId === 'adapter.session-application')
  .map(({ omittedModuleId }) => omittedModuleId));
assert.equal(descriptors.every(({ id }) => removableFromApplication.has(id)), true,
  'all eight Campaign modules must execute the production optional-removal path');
const rules = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-harness-rules.json'), 'utf8'));
const h117 = rules.rules.find(({ id }) => id === 'H117');
const h121 = rules.rules.find(({ id }) => id === 'H121');
assert.deepEqual({
  acceptanceEvidence: h117.acceptanceEvidence,
  humanReviewRequired: h117.humanReviewRequired,
  state: h117.state,
}, { acceptanceEvidence: null, humanReviewRequired: true, state: 'executable' });
assert.deepEqual({
  acceptanceEvidence: h121.acceptanceEvidence,
  humanReviewRequired: h121.humanReviewRequired,
  state: h121.state,
}, { acceptanceEvidence: null, humanReviewRequired: true, state: 'executable' });

for (const testCase of negativeCases) {
  assert.equal(negativeResults.get(testCase.name), testCase.expectedCode,
    `${testCase.name} negative control must execute with its declared diagnostic`);
}

if (process.env.V7_H121_SKIP_BROWSER !== '1') {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(TEST_DIR, 'validation-campaign-browser-harness.js')], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`H121 browser harness exited ${exitCode ?? signal}.`));
    });
  });
}

console.log(JSON.stringify({
  campaignId,
  cases: documentValue.caseRevisions.length,
  harness: 'H121-node',
  h117State: 'unchanged-executable-human-review-required',
  negativeControls: negativeCases.length,
  status: 'passed-automated-human-review-required',
}));
