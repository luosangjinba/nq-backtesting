import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  createCalculatedSeriesFrameIdentity,
  readCalculatedSeriesProjectionFrame,
} from '../src/calculated-series-contract/public.js';
import {
  readCalculatedSeriesPaneSurfaceCandidate,
} from '../src/calculated-series-chart-projection/public.js';
import {
  createCalculatedSeriesPersistenceAdapter,
  decodeCalculatedSeriesDocumentEnvelope,
  encodeCalculatedSeriesDocumentEnvelope,
} from '../src/calculated-series-persistence/public.js';
import { createCalculatedSeriesRuntime } from '../src/calculated-series-runtime/public.js';
import {
  MOVING_AVERAGES_DEFINITION_DIGEST,
  MOVING_AVERAGES_FORMULA_DIGEST,
  MOVING_AVERAGES_PACKAGE_DIGEST,
  MOVING_AVERAGES_PACKAGE_ID,
  MOVING_AVERAGES_PARAMETER_SCHEMA,
  MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST,
  MOVING_AVERAGES_PLUGIN_MANIFEST,
  MOVING_AVERAGES_VERSION,
  SMA_CLOSE_DEFINITION,
  SMA_CLOSE_FORMULA_IDENTITY_WIRE,
  TRUSTED_CALCULATED_SERIES_EXECUTOR,
  calculateSmaClose,
  createMovingAveragesRegistration,
  normalizeMovingAveragesSettings,
  readTrustedCalculatedSeriesRegistration,
} from '../src/core-moving-averages/public.js';
import {
  readBuiltInPluginManifest,
  readPluginParameterSchema,
} from '../src/plugin-contract/public.js';
import {
  createReplayCursorTargetProposal,
} from '../src/replay-contract/public.js';
import {
  applyReplicatedEntries,
  captureReplicatedEntries,
  isReplicatedStateKey,
} from '../src/server-state-sync/snapshot.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  createTrustedCalculatedSeriesExecutionAdapter,
} from '../src/trusted-calculated-series-execution/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';
import { createTrustedCalculatedSeriesCatalog } from '../src/calculated-series-runtime/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/core-moving-averages/negative/cases.json',
), 'utf8')).cases;
const negativeResults = new Map();
const fixedDigest = (character) => `sha256:${character.repeat(64)}`;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256')
    .update(JSON.stringify(canonical(value))).digest('hex')}`;
}

function expectCode(name, callback, code) {
  assert.throws(callback, (error) => error?.code === code, `${name} must fail with ${code}`);
  negativeResults.set(name, code);
}

async function expectCodeAsync(name, callback, code) {
  await assert.rejects(callback, (error) => error?.code === code, `${name} must fail with ${code}`);
  negativeResults.set(name, code);
}

function bars(count, { firstTime = 1_000, firstValue = 1, stepMs = 1_000 } = {}) {
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    close: firstValue + index,
    displayEpochMs: firstTime + (index * stepMs),
  })));
}

function storagePort(initial = new Map()) {
  const values = initial;
  return Object.freeze({
    read: (key) => values.get(key) ?? null,
    remove: (key) => values.delete(key),
    values,
    write: (key, value) => values.set(key, value),
  });
}

function identity(label, sessionId = 'session-h120') {
  return createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(1),
    sessionId: createSessionId(sessionId),
    transactionId: createTransactionId(`transaction-${label}`),
  });
}

function projectedPane(paneId, count = 30, label = paneId, { cutoffEpochMs = null } = {}) {
  const projectedBars = Object.freeze(bars(count).map((bar) => Object.freeze({
    ...bar,
    high: bar.close + 1,
    low: bar.close - 1,
    open: bar.close - 0.5,
    startEpochMs: bar.displayEpochMs - 1_000,
    volume: 10,
  })));
  const transactionIdentity = identity(`pane-${label}`);
  const cutoff = cutoffEpochMs ?? projectedBars.at(-1)?.displayEpochMs ?? 0;
  const proposal = createReplayCursorTargetProposal({
    baseRevision: 0,
    cursorEpochMs: 0,
    identity: transactionIdentity,
    range: { endEpochMs: Math.max(100_000, cutoff), startEpochMs: 0 },
    targetEpochMs: cutoff,
  });
  return Object.freeze({
    bars: projectedBars,
    paneId,
    provenance: Object.freeze({
      cursorProposal: proposal,
      datasetRevision: 'dataset-revision-h120',
      instrumentId: 'SYNTHETIC',
      providerId: 'synthetic-h120',
    }),
    schemaVersion: 1,
  });
}

function fakeChartPort() {
  const panes = new Map();
  let failNextApply = false;
  const stateFor = (paneId) => panes.get(paneId) ?? {
    acceptedChartRevision: 0, acceptedSurfaceRevision: 0, candidate: null,
  };
  return Object.freeze({
    acceptWorkspace(paneId, candidate, targetChartRevision) {
      const record = readCalculatedSeriesPaneSurfaceCandidate(candidate);
      panes.set(paneId, {
        acceptedChartRevision: targetChartRevision,
        acceptedSurfaceRevision: record.targetSurfaceRevision,
        candidate: record,
      });
      return record;
    },
    failNextApply() { failNextApply = true; },
    async prepare(paneId, candidate) {
      const record = readCalculatedSeriesPaneSurfaceCandidate(candidate);
      const previous = stateFor(paneId);
      assert.equal(record.baseSurfaceRevision, previous.acceptedSurfaceRevision);
      let phase = 'prepared';
      const receipt = Object.freeze({ paneId, target: record.targetSurfaceRevision });
      return Object.freeze({
        async apply() {
          if (failNextApply) {
            failNextApply = false;
            const error = new Error('Injected Chart apply failure.');
            error.code = 'H120_INJECTED_CHART_APPLY';
            throw error;
          }
          assert.equal(phase, 'prepared');
          phase = 'applied';
          return receipt;
        },
        async dispose() { assert.equal(phase, 'prepared'); phase = 'rolled-back'; },
        async finalize(candidateReceipt) {
          assert.equal(candidateReceipt, receipt);
          assert.equal(phase, 'applied');
          phase = 'finalized';
          panes.set(paneId, {
            acceptedChartRevision: previous.acceptedChartRevision,
            acceptedSurfaceRevision: record.targetSurfaceRevision,
            candidate: record,
          });
        },
        async rollback(candidateReceipt) {
          assert.equal(candidateReceipt, receipt);
          assert.equal(phase, 'applied');
          phase = 'rolled-back';
        },
      });
    },
    readCandidate: (paneId) => stateFor(paneId).candidate,
    snapshot(paneId) {
      const pane = stateFor(paneId);
      return Object.freeze({
        acceptedChartRevision: pane.acceptedChartRevision,
        acceptedSurfaceRevision: pane.acceptedSurfaceRevision,
      });
    },
  });
}

async function acceptWorkspace(runtime, chart, paneSnapshot, sequence) {
  const paneId = paneSnapshot.paneId;
  const current = chart.snapshot(paneId);
  const transactionIdentity = identity(`workspace-${sequence}`);
  const prepared = await runtime.prepareWorkspaceSurface({
    acceptedChartRevision: current.acceptedChartRevision,
    baseSurfaceRevision: current.acceptedSurfaceRevision,
    paneSnapshot,
    signal: new AbortController().signal,
    targetChartRevision: current.acceptedChartRevision + 1,
    targetSurfaceRevision: current.acceptedSurfaceRevision + 1,
    transactionIdentity,
    workspacePaneId: paneId,
    workspaceStateRevision: current.acceptedChartRevision + 1,
  });
  assert.ok(prepared, 'a live Pane must produce a reversible runtime context preparation');
  if (prepared.candidate === null) {
    runtime.acceptWorkspaceSurface(prepared.token);
    return null;
  }
  const record = chart.acceptWorkspace(
    paneId, prepared.candidate, current.acceptedChartRevision + 1,
  );
  runtime.acceptWorkspaceSurface(prepared.token);
  return record;
}

function runtimeFixture({
  execution = createTrustedCalculatedSeriesExecutionAdapter({ now: () => 0 }),
  map = new Map(),
  registrations = null,
  scheduleTask,
  sessionId = 'session-h120',
} = {}) {
  let nextId = 0;
  const storage = storagePort(map);
  const persistence = createCalculatedSeriesPersistenceAdapter({ storage });
  const registration = createMovingAveragesRegistration();
  const entries = registrations ?? [Object.freeze({
    read: readTrustedCalculatedSeriesRegistration,
    registration,
  })];
  const runtime = createCalculatedSeriesRuntime({
    activationGeneration: 1,
    execution,
    idFactory: () => `${++nextId}`,
    persistence,
    readProfileSnapshot: () => Object.freeze({ packages: Object.freeze([]) }),
    registrations: entries,
    scheduleTask,
    sessionId,
  });
  const chart = fakeChartPort();
  runtime.bindChartPort(chart);
  return { chart, map, persistence, registration, runtime, storage };
}

function frameIdentity(registration, transactionIdentity = identity('execution')) {
  return createCalculatedSeriesFrameIdentity({
    datasetProvenance: {
      datasetDigest: fixedDigest('1'),
      datasetId: 'dataset-h120',
      datasetRevision: 'dataset-revision-h120',
      sourceId: 'source-h120',
    },
    definition: SMA_CLOSE_DEFINITION,
    documentRevision: 1,
    effectiveParameterDigest: fixedDigest('2'),
    executor: TRUSTED_CALCULATED_SERIES_EXECUTOR,
    hostApi: { id: 'v7.host-api', version: '1.0.0' },
    inputDigest: fixedDigest('3'),
    instanceId: 'instance-h120',
    instanceRevision: 1,
    projectedPaneSnapshotDigest: fixedDigest('4'),
    replayVisibleThroughEpochMs: 30_000_000,
    sdkContract: { id: 'v7.calculated-series-sdk', version: '1.0.0' },
    workspacePaneId: 'pane-h120',
    workspaceStateRevision: 1,
    workspaceTransactionIdentity: transactionIdentity,
  });
}

function webStorage(values = new Map()) {
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

// Exact P0a package, one Definition, and pinned portable identities.
const manifest = readBuiltInPluginManifest(MOVING_AVERAGES_PLUGIN_MANIFEST);
const schema = readPluginParameterSchema(MOVING_AVERAGES_PARAMETER_SCHEMA);
assert.equal(manifest.packageId, 'first-party.moving-averages');
assert.equal(manifest.packageVersion, '1.0.0');
assert.equal(manifest.contributions.length, 1);
assert.equal(manifest.contributions[0].id, 'indicator.moving-averages');
assert.equal(manifest.contributions[0].kind, 'indicator');
assert.deepEqual(manifest.permissions, []);
assert.equal(digest(schema), MOVING_AVERAGES_PARAMETER_SCHEMA_DIGEST);
assert.equal(digest(SMA_CLOSE_FORMULA_IDENTITY_WIRE), MOVING_AVERAGES_FORMULA_DIGEST);
assert.match(MOVING_AVERAGES_DEFINITION_DIGEST, /^sha256:[a-f0-9]{64}$/u);
assert.match(MOVING_AVERAGES_PACKAGE_DIGEST, /^sha256:[a-f0-9]{64}$/u);
assert.equal(MOVING_AVERAGES_PACKAGE_ID, 'first-party.moving-averages');
assert.equal(MOVING_AVERAGES_VERSION, '1.0.0');

const registration = createMovingAveragesRegistration();
const registrationEntry = Object.freeze({ read: readTrustedCalculatedSeriesRegistration, registration });
const catalog = createTrustedCalculatedSeriesCatalog([registrationEntry]);
assert.equal(catalog.list().length, 1);
expectCode('plain-registration', () => createTrustedCalculatedSeriesCatalog([{
  read: readTrustedCalculatedSeriesRegistration, registration: {},
}]), 'CALCULATED_SERIES_RUNTIME_REGISTRATION_REJECTED');
expectCode('duplicate-registration', () => createTrustedCalculatedSeriesCatalog([
  registrationEntry, registrationEntry,
]), 'CALCULATED_SERIES_RUNTIME_REGISTRATION_DUPLICATE');

// Golden exact-L SMA fixtures, warmup, gaps, determinism, and negative zero.
for (const length of [2, 20, 500]) {
  const inputBars = bars(length + 1);
  const first = calculateSmaClose({ displayBars: inputBars, length, warmupBars: Object.freeze([]) });
  assert.equal(first.filter(({ state }) => state === 'whitespace').length, length - 1);
  assert.equal(first[length - 1].value, (length + 1) / 2);
  assert.equal(first[length].value, (length + 3) / 2);
  assert.deepEqual(first, calculateSmaClose({
    displayBars: inputBars, length, warmupBars: Object.freeze([]),
  }), `SMA(${length}) must repeat byte-for-byte`);
}
assert.deepEqual(calculateSmaClose({
  displayBars: bars(1, { firstTime: 2_000, firstValue: 4 }),
  length: 2,
  warmupBars: bars(1, { firstValue: 2 }),
}), [{ displayEpochMs: 2_000, state: 'value', value: 3 }]);
assert.deepEqual(calculateSmaClose({
  displayBars: Object.freeze([
    Object.freeze({ close: 2, displayEpochMs: 1_000 }),
    Object.freeze({ close: 4, displayEpochMs: 86_401_000 }),
  ]),
  length: 2,
  warmupBars: Object.freeze([]),
}).at(-1), { displayEpochMs: 86_401_000, state: 'value', value: 3 });
const negativeZero = calculateSmaClose({
  displayBars: Object.freeze([
    Object.freeze({ close: -0, displayEpochMs: 1_000 }),
    Object.freeze({ close: -0, displayEpochMs: 2_000 }),
  ]),
  length: 2,
  warmupBars: Object.freeze([]),
}).at(-1).value;
assert.equal(Object.is(negativeZero, -0), false);

expectCode('fractional-length', () => normalizeMovingAveragesSettings({
  instanceValues: { length: 2.5 },
}), 'PLUGIN_SETTINGS_INVALID');
expectCode('length-below-minimum', () => normalizeMovingAveragesSettings({
  instanceValues: { length: 1 },
}), 'PLUGIN_SETTINGS_INVALID');
expectCode('length-above-maximum', () => normalizeMovingAveragesSettings({
  instanceValues: { length: 501 },
}), 'PLUGIN_SETTINGS_INVALID');
expectCode('nonfinite-close', () => calculateSmaClose({
  displayBars: Object.freeze([Object.freeze({ close: Number.NaN, displayEpochMs: 1_000 })]),
  length: 2,
  warmupBars: Object.freeze([]),
}), 'MOVING_AVERAGES_BAR_INVALID');
expectCode('unordered-bars', () => calculateSmaClose({
  displayBars: Object.freeze([
    Object.freeze({ close: 1, displayEpochMs: 2_000 }),
    Object.freeze({ close: 2, displayEpochMs: 1_000 }),
  ]),
  length: 2,
  warmupBars: Object.freeze([]),
}), 'MOVING_AVERAGES_BAR_INVALID');
expectCode('foreign-bar-field', () => calculateSmaClose({
  displayBars: Object.freeze([Object.freeze({ close: 1, displayEpochMs: 1_000, open: 1 })]),
  length: 2,
  warmupBars: Object.freeze([]),
}), 'MOVING_AVERAGES_BAR_INVALID');

const precedence = normalizeMovingAveragesSettings({
  instanceValues: { length: 30 },
  packageValues: { length: 10, lineColor: '#112233FF' },
  profileValues: { length: 20, lineWidth: 3 },
});
assert.equal(precedence.parameters.length, 30);
assert.deepEqual(precedence.sources, {
  length: 'instance', lineColor: 'package', linePattern: 'definition-default',
  lineWidth: 'profile', visible: 'definition-default',
});

// Trusted execution closes inputs, cancellation, resource ceilings, and failures.
const trustedRecord = readTrustedCalculatedSeriesRegistration(registration);
const execution = createTrustedCalculatedSeriesExecutionAdapter({ now: (() => {
  const values = [4, 6];
  return () => values.shift() ?? 6;
})() });
const displayBars = bars(30);
const controller = new AbortController();
const result = execution.execute({
  displayBars,
  eligibleTimeline: Object.freeze(displayBars.map(({ displayEpochMs }) => displayEpochMs)),
  frameIdentity: frameIdentity(trustedRecord),
  parameters: Object.freeze({ length: 20 }),
  registration: trustedRecord,
  resultRevision: 1,
  signal: controller.signal,
  warmupBars: Object.freeze([]),
});
const directResourceUsage = result.read().resourceUsage;
assert.equal(directResourceUsage.durationMs, 2);
assert.equal(directResourceUsage.actualInputBars, 30);
assert.equal(result.read().plotGroups[0].plots[0].points.at(-1).value, 20.5);
controller.abort();
expectCode('cancelled-execution', () => execution.execute({
  displayBars,
  eligibleTimeline: Object.freeze(displayBars.map(({ displayEpochMs }) => displayEpochMs)),
  frameIdentity: frameIdentity(trustedRecord, identity('cancelled')),
  parameters: Object.freeze({ length: 20 }),
  registration: trustedRecord,
  resultRevision: 1,
  signal: controller.signal,
  warmupBars: Object.freeze([]),
}), 'TRUSTED_CALCULATED_SERIES_CANCELLED');
const oversizedBars = bars(20_001);
expectCode('oversized-input', () => execution.execute({
  displayBars: oversizedBars,
  eligibleTimeline: Object.freeze(oversizedBars.map(({ displayEpochMs }) => displayEpochMs)),
  frameIdentity: frameIdentity(trustedRecord, identity('oversized')),
  parameters: Object.freeze({ length: 20 }),
  registration: trustedRecord,
  resultRevision: 1,
  signal: new AbortController().signal,
  warmupBars: Object.freeze([]),
}), 'TRUSTED_CALCULATED_SERIES_RESOURCE_LIMIT');
expectCode('formula-failure', () => execution.execute({
  displayBars,
  eligibleTimeline: Object.freeze(displayBars.map(({ displayEpochMs }) => displayEpochMs)),
  frameIdentity: frameIdentity(trustedRecord, identity('formula-failure')),
  parameters: Object.freeze({ length: 20 }),
  registration: Object.freeze({ ...trustedRecord, formula() { throw new Error('fixture'); } }),
  resultRevision: 1,
  signal: new AbortController().signal,
  warmupBars: Object.freeze([]),
}), 'TRUSTED_CALCULATED_SERIES_FORMULA_FAILED');

// Canonical sidecar, exact CAS/rollback, and state-sync allowlisting.
const document = { documentRevision: 1, schemaVersion: 1, sessionId: 'session-h120', workspacePanes: [] };
const encoded = encodeCalculatedSeriesDocumentEnvelope('session-h120', document);
assert.deepEqual(decodeCalculatedSeriesDocumentEnvelope('session-h120', encoded.raw), document);
expectCode('noncanonical-persistence', () => decodeCalculatedSeriesDocumentEnvelope(
  'session-h120', JSON.stringify({ version: 1, schema: 'v7.calculated-series-document', payload: document }),
), 'CALCULATED_SERIES_PERSISTENCE_NON_CANONICAL');
expectCode('foreign-session-persistence', () => decodeCalculatedSeriesDocumentEnvelope(
  'session-foreign', encoded.raw,
), 'CALCULATED_SERIES_PERSISTENCE_SESSION_MISMATCH');
const persistenceStorage = storagePort();
const persistence = createCalculatedSeriesPersistenceAdapter({ storage: persistenceStorage });
const preparedWrite = persistence.prepare({ expectedRaw: null, payload: document, sessionId: 'session-h120' });
const writeReceipt = persistence.apply(preparedWrite);
persistence.rollback(preparedWrite);
assert.equal(persistenceStorage.values.size, 0);
assert.ok(writeReceipt.raw.length > 0);
persistenceStorage.write(encoded.key, 'foreign');
expectCode('stale-persistence-cas', () => persistence.prepare({
  expectedRaw: null, payload: document, sessionId: 'session-h120',
}), 'CALCULATED_SERIES_PERSISTENCE_CAS_STALE');
const browserStorage = webStorage(new Map([
  [encoded.key, encoded.raw], ['unrelated', 'keep'],
]));
assert.equal(isReplicatedStateKey(encoded.key), true);
const captured = captureReplicatedEntries(browserStorage);
assert.deepEqual(captured, [{ key: encoded.key, value: encoded.raw }]);
applyReplicatedEntries(browserStorage, captured);
assert.equal(browserStorage.getItem('unrelated'), 'keep');

// Full package-neutral runtime command loop and reversible failure paths.
const fixture = runtimeFixture();
await fixture.runtime.initialize();
const pane = projectedPane('pane-h120');
let candidate = await acceptWorkspace(fixture.runtime, fixture.chart, pane, 1);
assert.equal(candidate, null, 'a Pane with no retained instance must allocate no Chart surface');
let snapshot = fixture.runtime.snapshot();
assert.equal(snapshot.catalog.length, 1);
assert.equal(snapshot.catalog[0].displayName, 'Simple Moving Average');
const definitionRef = snapshot.catalog[0].definitionRef;
snapshot = await fixture.runtime.execute({
  definitionRef,
  expectedDocumentRevision: snapshot.documentRevision,
  instanceValues: {},
  kind: 'add-instance',
  workspacePaneId: pane.paneId,
});
let instance = snapshot.panes[0].instances[0];
assert.equal(instance.legendLabel, 'SMA 20');
assert.equal(instance.latestValue, 20.5);
assert.equal(instance.calculation.resourceUsage.outputPoints, 30);
assert.equal(snapshot.calculationCount, 1);
const initialProvenance = instance.calculation.provenance;
const initialCalculationCount = snapshot.calculationCount;

snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  instanceValues: { lineColor: '#FF00FFFF' },
  kind: 'apply-instance-settings',
  workspacePaneId: pane.paneId,
});
instance = snapshot.panes[0].instances[0];
assert.equal(snapshot.calculationCount, initialCalculationCount, 'style must reuse exact values');
assert.deepEqual(instance.calculation.provenance, initialProvenance);
assert.equal(instance.effectiveSettings.lineColor, '#FF00FFFF');

snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  instanceValues: { length: 2, lineColor: '#FF00FFFF' },
  kind: 'apply-instance-settings',
  workspacePaneId: pane.paneId,
});
instance = snapshot.panes[0].instances[0];
assert.equal(instance.latestValue, 29.5);
assert.equal(snapshot.calculationCount, initialCalculationCount + 1);
const lengthTwoProvenance = instance.calculation.provenance;

snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'move-plot-group-to-new-region',
  workspacePaneId: pane.paneId,
});
instance = snapshot.panes[0].instances[0];
assert.equal(instance.placement, 'own-region');
assert.equal(snapshot.calculationCount, initialCalculationCount + 1);
assert.deepEqual(instance.calculation.provenance, lengthTwoProvenance);

snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'set-instance-visibility',
  visible: false,
  workspacePaneId: pane.paneId,
});
instance = snapshot.panes[0].instances[0];
assert.equal(instance.state, 'hidden');
snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'set-instance-visibility',
  visible: true,
  workspacePaneId: pane.paneId,
});
instance = snapshot.panes[0].instances[0];
assert.equal(instance.state, 'ready');
assert.equal(snapshot.calculationCount, initialCalculationCount + 1);

await expectCodeAsync('stale-document-command', () => fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision - 1,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'move-plot-group-to-main',
  workspacePaneId: pane.paneId,
}), 'CALCULATED_SERIES_RUNTIME_DOCUMENT_STALE');
await expectCodeAsync('stale-instance-command', () => fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision - 1,
  instanceId: instance.instanceId,
  kind: 'move-plot-group-to-main',
  workspacePaneId: pane.paneId,
}), 'CALCULATED_SERIES_RUNTIME_INSTANCE_STALE');

const rawBeforeFailure = fixture.map.values().next().value;
const revisionBeforeFailure = snapshot.documentRevision;
fixture.chart.failNextApply();
await expectCodeAsync('chart-apply-rollback', () => fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'move-plot-group-to-main',
  workspacePaneId: pane.paneId,
}), 'H120_INJECTED_CHART_APPLY');
assert.equal(fixture.runtime.snapshot().documentRevision, revisionBeforeFailure);
assert.equal(fixture.map.values().next().value, rawBeforeFailure);

const paneRemovalIdentity = identity('pane-removal');
const paneRemoval = fixture.runtime.prepareWorkspaceTransaction({
  identity: paneRemovalIdentity,
  workspaceSnapshot: Object.freeze({ panes: Object.freeze([]) }),
});
const paneRemovalReceipt = paneRemoval.apply();
paneRemoval.rollback(paneRemovalReceipt);
assert.equal(fixture.runtime.snapshot().documentRevision, revisionBeforeFailure);
assert.equal(fixture.map.values().next().value, rawBeforeFailure);

snapshot = fixture.runtime.snapshot();
instance = snapshot.panes[0].instances[0];
snapshot = await fixture.runtime.execute({
  expectedDocumentRevision: snapshot.documentRevision,
  expectedInstanceRevision: instance.instanceRevision,
  instanceId: instance.instanceId,
  kind: 'remove-instance',
  workspacePaneId: pane.paneId,
});
assert.equal(snapshot.panes[0].instances.length, 0);
const removedCandidate = fixture.chart.readCandidate(pane.paneId);
assert.equal(removedCandidate.projectionFrames.length, 0);
fixture.runtime.dispose();

// A higher-timeframe Pane may expose one trailing in-progress candle whose
// display time is later than the exact Replay cutoff. The complete Pane digest
// remains bound, while only the no-future prefix is eligible for calculation.
const cutoffFixture = runtimeFixture({ sessionId: 'session-cutoff-tail' });
await cutoffFixture.runtime.initialize();
const cutoffPane = projectedPane('pane-cutoff-tail', 30, 'cutoff-tail', {
  cutoffEpochMs: 28_500,
});
await acceptWorkspace(cutoffFixture.runtime, cutoffFixture.chart, cutoffPane, 10);
let cutoffSnapshot = cutoffFixture.runtime.snapshot();
cutoffSnapshot = await cutoffFixture.runtime.execute({
  definitionRef: cutoffSnapshot.catalog[0].definitionRef,
  expectedDocumentRevision: cutoffSnapshot.documentRevision,
  instanceValues: {},
  kind: 'add-instance',
  workspacePaneId: cutoffPane.paneId,
});
const cutoffInstance = cutoffSnapshot.panes[0].instances[0];
const cutoffCandidate = cutoffFixture.chart.readCandidate(cutoffPane.paneId);
const cutoffPoints = cutoffCandidate.projectionFrames[0].plotGroups[0].plots[0].points;
assert.equal(cutoffCandidate.projectionFrames[0].state, 'ready');
assert.equal(cutoffInstance.calculation.resourceUsage.actualInputBars, 28);
assert.equal(cutoffInstance.latestValue, 18.5);
assert.equal(cutoffPoints.length, 28);
assert.equal(cutoffPoints.at(-1).displayEpochMs, 28_000);
assert.equal(cutoffPoints.every(({ displayEpochMs }) => displayEpochMs <= 28_500), true,
  'SMA output must exclude a trailing in-progress candle later than Replay cutoff');
cutoffFixture.runtime.dispose();

// Disable preserves unresolved bytes; re-enable resolves and freshly recalculates.
const durableMap = new Map();
const enabled = runtimeFixture({ map: durableMap, sessionId: 'session-disable' });
await enabled.runtime.initialize();
const disablePane = projectedPane('pane-disable', 30, 'disable');
await acceptWorkspace(enabled.runtime, enabled.chart, disablePane, 2);
let durableSnapshot = enabled.runtime.snapshot();
durableSnapshot = await enabled.runtime.execute({
  definitionRef: durableSnapshot.catalog[0].definitionRef,
  expectedDocumentRevision: durableSnapshot.documentRevision,
  instanceValues: {},
  kind: 'add-instance',
  workspacePaneId: disablePane.paneId,
});
enabled.runtime.dispose();

const disabled = runtimeFixture({ map: durableMap, registrations: [], sessionId: 'session-disable' });
await disabled.runtime.initialize();
assert.equal(disabled.runtime.snapshot().panes[0].unresolvedInstances.length, 1);
assert.equal(disabled.runtime.snapshot().panes[0].instances.length, 0);
disabled.runtime.dispose();

const mismatchMap = new Map(durableMap);
const [mismatchKey, mismatchRaw] = [...mismatchMap.entries()][0];
const mismatchPayload = structuredClone(decodeCalculatedSeriesDocumentEnvelope(
  'session-disable', mismatchRaw,
));
mismatchPayload.workspacePanes[0].unresolvedInstances[0]
  .originalWire.parameterOverrides.length = 99;
mismatchMap.set(mismatchKey, encodeCalculatedSeriesDocumentEnvelope(
  'session-disable', mismatchPayload,
).raw);
const mismatch = runtimeFixture({ map: mismatchMap, sessionId: 'session-disable' });
await mismatch.runtime.initialize();
assert.equal(
  mismatch.runtime.snapshot().panes[0].unresolvedInstances[0].reasonCode,
  'CALCULATED_SERIES_UNRESOLVED_DIGEST_MISMATCH',
);
negativeResults.set(
  'unresolved-digest-mismatch', 'CALCULATED_SERIES_UNRESOLVED_DIGEST_MISMATCH',
);
mismatch.runtime.dispose();

const reenabled = runtimeFixture({ map: durableMap, sessionId: 'session-disable' });
await reenabled.runtime.initialize();
assert.equal(reenabled.runtime.snapshot().panes[0].instances.length, 1);
candidate = await acceptWorkspace(reenabled.runtime, reenabled.chart, disablePane, 3);
assert.equal(candidate.projectionFrames[0].state, 'ready');
assert.equal(reenabled.runtime.snapshot().calculationCount, 1);
reenabled.runtime.dispose();

// Four instances loaded together cross the 8ms budget, publish pending, then settle once.
const deferredMap = new Map();
const seed = runtimeFixture({ map: deferredMap, sessionId: 'session-deferred' });
await seed.runtime.initialize();
const deferredPane = projectedPane('pane-deferred', 30, 'deferred');
await acceptWorkspace(seed.runtime, seed.chart, deferredPane, 4);
let seedSnapshot = seed.runtime.snapshot();
for (let index = 0; index < 4; index += 1) {
  seedSnapshot = await seed.runtime.execute({
    definitionRef: seedSnapshot.catalog[0].definitionRef,
    expectedDocumentRevision: seedSnapshot.documentRevision,
    instanceValues: { length: 2 + index },
    kind: 'add-instance',
    workspacePaneId: deferredPane.paneId,
  });
}
seed.runtime.dispose();
const scheduled = [];
let clock = 0;
const slowExecution = createTrustedCalculatedSeriesExecutionAdapter({
  now: () => { const value = clock; clock += 9; return value; },
});
const deferred = runtimeFixture({
  execution: slowExecution,
  map: deferredMap,
  scheduleTask: (callback) => { scheduled.push(callback); return scheduled.length; },
  sessionId: 'session-deferred',
});
await deferred.runtime.initialize();
candidate = await acceptWorkspace(deferred.runtime, deferred.chart, deferredPane, 5);
assert.deepEqual(candidate.projectionFrames.map(({ state }) => state), [
  'ready', 'pending', 'pending', 'pending',
]);
assert.equal(scheduled.length, 1);
await scheduled.shift()();
assert.equal(deferred.runtime.snapshot().panes[0].instances
  .every(({ state }) => state === 'ready'), true);
assert.equal(deferred.runtime.snapshot().calculationCount, 4);
deferred.runtime.dispose();

// Product catalog and source closure: no second real Indicator algorithm or dependency.
const coreCatalogSource = fs.readFileSync(path.join(V7_ROOT, 'app/core-plugin-catalog.js'), 'utf8');
assert.match(coreCatalogSource, /MOVING_AVERAGES_PLUGIN_MANIFEST/u);
for (const forbidden of ['EMA', 'WMA', 'RSI', 'MACD', 'Bollinger', 'oakscript']) {
  assert.equal(new RegExp(`\\b${forbidden}\\b`, 'iu').test(coreCatalogSource), false,
    `${forbidden} must not enter product catalog`);
}
const packageFiles = fs.readdirSync(path.join(V7_ROOT, 'src/core-moving-averages'));
assert.equal(packageFiles.some((file) => /(?:^|[-_.])(?:ema|wma|rsi|macd)(?:[-_.]|$)/iu.test(file)), false);

const rules = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-harness-rules.json'), 'utf8'));
const h117 = rules.rules.find(({ id }) => id === 'H117');
const h120 = rules.rules.find(({ id }) => id === 'H120');
assert.deepEqual({
  acceptanceEvidence: h117.acceptanceEvidence,
  humanReviewRequired: h117.humanReviewRequired,
  state: h117.state,
}, { acceptanceEvidence: null, humanReviewRequired: true, state: 'executable' });
assert.deepEqual({
  acceptanceEvidence: h120.acceptanceEvidence,
  humanReviewRequired: h120.humanReviewRequired,
  state: h120.state,
}, {
  acceptanceEvidence: 'sessions/session_20260818_p1c_3_h120_core_sma_human_acceptance.md',
  humanReviewRequired: true,
  state: 'accepted',
});

for (const testCase of negativeCases) {
  assert.equal(
    negativeResults.get(testCase.name),
    testCase.expectedCode,
    `${testCase.name} negative control must run with its declared diagnostic`,
  );
}

if (process.env.V7_H120_SKIP_BROWSER !== '1') {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(TEST_DIR, 'core-moving-averages-browser-harness.js')], {
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`H120 browser harness exited ${code ?? signal}.`));
    });
  });
}

console.log(JSON.stringify({
  formulas: [2, 20, 500],
  harness: 'H120',
  h117State: 'unchanged-executable-human-review-required',
  negativeControls: negativeCases.length,
  package: `${MOVING_AVERAGES_PACKAGE_ID}@${MOVING_AVERAGES_VERSION}`,
  resourceUsage: directResourceUsage,
  status: 'accepted',
}));
