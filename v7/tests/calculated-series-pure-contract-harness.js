import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assessContributionProfileCompatibility,
  calculatedSeriesProfileRef,
  createContributionProfileRegistry,
  createInitialContributionProfileRegistry,
  defineContributionProfileRef,
  readContributionProfileDescriptor,
  readContributionProfileRegistry,
  resolveContributionProfile,
} from '../src/contribution-profile-contract/public.js';
import {
  assessCalculatedSeriesFrameCurrency,
  assessScaleIntentCompatibility,
  CALCULATED_SERIES_LIMITS,
  createCalculatedSeriesFrameIdentity,
  defineCalculatedSeriesContributionBinding,
  defineCalculatedSeriesDefinition,
  defineCalculatedSeriesMigrationPlan,
  defineCalculatedSeriesProjectionFrame,
  defineCalculatedSeriesResult,
  defineCalculatedSeriesWorkspaceDocument,
  definePlotGroup,
  defineScaleIntent,
  readCalculatedSeriesContributionBinding,
  readCalculatedSeriesDefinition,
  readCalculatedSeriesFrameIdentity,
  readCalculatedSeriesMigrationPlan,
  readCalculatedSeriesProjectionFrame,
  readCalculatedSeriesResult,
  readCalculatedSeriesScaleCatalog,
  readCalculatedSeriesWorkspaceDocument,
  simulateCalculatedSeriesMigration,
  validateCalculatedSeriesMigrationChain,
  verifyCalculatedSeriesUnresolvedIntegrity,
} from '../src/calculated-series-contract/public.js';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const FIXTURE_ROOT = path.join(TEST_DIR, 'fixtures/calculated-series-pure-contract');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(FIXTURE_ROOT, relativePath), 'utf8'));
const clone = (value) => structuredClone(value);
const canonicalClone = (value) => {
  if (Array.isArray(value)) return value.map(canonicalClone);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalClone(value[key])]),
  );
  return value;
};
const fixedDigest = (character) => `sha256:${character.repeat(64)}`;
const digestCanonical = async (value) => `sha256:${crypto.createHash('sha256')
  .update(JSON.stringify(value)).digest('hex')}`;
const createPinnedRegistry = (value) => createContributionProfileRegistry(
  value,
  { authority: 'host-pinned' },
);

function expectCode(expectedCode, operation) {
  assert.throws(operation, (error) => {
    assert.equal(error?.code, expectedCode, error?.stack ?? String(error));
    return true;
  });
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, 'portable contract records must be deeply frozen');
  Object.values(value).forEach(assertDeepFrozen);
}

function assertJsonRoundTrip(value) {
  assert.deepEqual(JSON.parse(JSON.stringify(value)), value);
  assertDeepFrozen(value);
}

async function expectCodeAsync(expectedCode, operation) {
  await assert.rejects(operation, (error) => {
    assert.equal(error?.code, expectedCode, error?.stack ?? String(error));
    return true;
  });
}

const registry = createInitialContributionProfileRegistry();
const definitionFixture = readJson('positive/synthetic-definition.json');
const documentFixture = readJson('positive/workspace-document.json');
const definition = defineCalculatedSeriesDefinition(definitionFixture, { profileRegistry: registry });

function bindingWire() {
  const { identity, profile } = definitionFixture;
  return {
    schemaVersion: 1,
    packageId: identity.packageId,
    packageVersion: identity.packageVersion,
    contributionId: identity.contributionId,
    contributionVersion: identity.contributionVersion,
    declaredKind: 'indicator',
    profile,
    definitionId: identity.definitionId,
    definitionVersion: identity.definitionVersion,
  };
}

function scaleIntentFromCatalog(entry) {
  const formatterIdentity = entry.formatterIds[0];
  const separator = formatterIdentity.lastIndexOf('@');
  const formatterId = formatterIdentity.slice(0, separator);
  const formatterVersion = formatterIdentity.slice(separator + 1);
  return {
    schemaVersion: 1,
    dimension: {
      dimensionId: entry.dimensionId,
      dimensionVersion: entry.dimensionVersion,
    },
    unit: { unitId: entry.unitId, unitVersion: entry.unitVersion },
    transform: 'linear',
    domain: { kind: 'auto' },
    formatter: {
      formatterId,
      formatterVersion,
      options: formatterId === 'host.volume'
        ? { compact: false, decimals: 2 }
        : { decimals: 2 },
    },
    zeroPolicy: 'not-required',
  };
}

function createFrame({ cutoff = 3_000, instanceRevision = 2, definitionValue = definition } = {}) {
  const workspaceTransactionIdentity = createWorkspaceTransactionIdentity({
    activationGeneration: createActivationGeneration(7),
    sessionId: createSessionId('session-contract-fixture'),
    transactionId: createTransactionId('transaction-contract-fixture'),
  });
  return createCalculatedSeriesFrameIdentity({
    datasetProvenance: {
      datasetDigest: fixedDigest('2'),
      datasetId: 'dataset-contract-fixture',
      datasetRevision: 'dataset-revision-4',
      sourceId: 'source-contract-fixture',
    },
    definition: definitionValue,
    documentRevision: 3,
    effectiveParameterDigest: fixedDigest('3'),
    executor: { executorId: 'host.synthetic-contract-executor', executorVersion: '1.0.0' },
    hostApi: { id: 'host.calculated-series-api', version: '1.0.0' },
    inputDigest: fixedDigest('4'),
    instanceId: 'instance-synthetic',
    instanceRevision,
    projectedPaneSnapshotDigest: fixedDigest('5'),
    replayVisibleThroughEpochMs: cutoff,
    sdkContract: { id: 'sdk.calculated-series-contract', version: '1.0.0' },
    workspacePaneId: 'pane-contract-fixture',
    workspaceStateRevision: 9,
    workspaceTransactionIdentity,
  });
}

function readyGroups() {
  return [
    {
      plotGroupId: 'price-group',
      plots: [
        { plotId: 'line-output', kind: 'line', points: [
          { state: 'value', displayEpochMs: 1_000, value: 99 },
          { state: 'whitespace', displayEpochMs: 2_000 },
          { state: 'value', displayEpochMs: 3_000, value: 101 },
        ] },
        { plotId: 'area-output', kind: 'area', points: [
          { state: 'value', displayEpochMs: 1_000, value: 98 },
          { state: 'whitespace', displayEpochMs: 2_000 },
          { state: 'value', displayEpochMs: 3_000, value: 100 },
        ] },
        { plotId: 'baseline-output', kind: 'baseline', points: [
          { state: 'whitespace', displayEpochMs: 1_000 },
          { state: 'whitespace', displayEpochMs: 2_000 },
          { state: 'value', displayEpochMs: 3_000, value: -0 },
        ] },
        { plotId: 'band-output', kind: 'band', points: [
          { state: 'value', displayEpochMs: 1_000, lower: 95, upper: 105 },
          { state: 'whitespace', displayEpochMs: 2_000 },
          { state: 'whitespace', displayEpochMs: 3_000 },
        ] },
      ],
    },
    {
      plotGroupId: 'ratio-group',
      plots: [{ plotId: 'histogram-output', kind: 'histogram', points: [
        { state: 'value', displayEpochMs: 1_000, value: -1 },
        { state: 'whitespace', displayEpochMs: 2_000 },
        { state: 'value', displayEpochMs: 3_000, value: 1 },
      ] }],
    },
  ];
}

function provenance(frame) {
  return {
    calculationMode: 'full',
    datasetDigest: fixedDigest('2'),
    definitionDigest: fixedDigest('6'),
    executor: { executorId: 'host.synthetic-contract-executor', executorVersion: '1.0.0' },
    formulaDigest: fixedDigest('7'),
    inputTimelineDigest: fixedDigest('4'),
    packageDigest: fixedDigest('8'),
    parameterDigest: fixedDigest('3'),
    resultAncestry: [],
    warmupCoverage: { providedBars: 2, requestedBars: 2 },
  };
}

function diagnostics() {
  return [{
    code: 'CALCULATED_SERIES_FIXTURE_INFO',
    jsonPointer: '/plotGroups',
    logicalIdentity: 'instance-synthetic',
    message: 'Synthetic contract output is complete.',
    phase: 'validation',
    related: ['price-group'],
    severity: 'info',
  }];
}

function resultWire(frame, { state = 'ready', plotGroups = readyGroups(), diagnosticValues = diagnostics() } = {}) {
  const pointCount = state === 'ready' ? plotGroups.reduce((sum, group) => sum
    + group.plots.reduce((subtotal, plot) => subtotal + plot.points.length, 0), 0) : 0;
  return {
    schemaVersion: 1,
    frameIdentity: frame,
    resultRevision: 1,
    state,
    plotGroups: state === 'ready' ? plotGroups : [],
    provenance: provenance(frame),
    resourceUsage: {
      admittedInputBars: 3,
      actualInputBars: 3,
      outputPoints: pointCount,
      outputBytes: Buffer.byteLength(JSON.stringify(state === 'ready' ? plotGroups : [])),
      durationMs: 0.25,
      incrementalStateBytes: 0,
    },
    diagnostics: diagnosticValues,
  };
}

function projectionWire(frame, state = 'pending') {
  const wire = resultWire(frame, { state: state === 'ready' ? 'ready' : 'empty' });
  delete wire.resultRevision;
  wire.projectionRevision = 1;
  wire.state = state;
  return wire;
}

function defineHighLimitFixture({ extraPlot = false } = {}) {
  const wire = clone(definitionFixture);
  wire.resourceDeclaration = {
    maximumInputBars: 100_000,
    maximumOutputPoints: 100_000,
    maximumOutputBytes: 16 * 1024 * 1024,
    maximumIncrementalStateBytes: 0,
  };
  if (extraPlot) {
    wire.plotGroups[1].plots.push({
      ...clone(wire.plotGroups[0].plots[0]),
      displayName: 'Extra line output',
      plotId: 'extra-line-output',
    });
  }
  return defineCalculatedSeriesDefinition(wire, { profileRegistry: registry });
}

function largeOutputGroups(definitionValue, counts) {
  const wire = readCalculatedSeriesDefinition(definitionValue);
  let plotIndex = 0;
  return wire.plotGroups.map((group) => ({
    plotGroupId: group.plotGroupId,
    plots: group.plots.map((plot) => {
      const count = counts[plotIndex];
      plotIndex += 1;
      return {
        kind: plot.kind,
        plotId: plot.plotId,
        points: Array.from({ length: count }, (_, index) => (plot.kind === 'band'
          ? { state: 'value', displayEpochMs: index + 1, lower: index, upper: index + 2 }
          : { state: 'value', displayEpochMs: index + 1, value: index })),
      };
    }),
  }));
}

function defineLargeResult(definitionValue, counts) {
  const maximumCount = Math.max(...counts);
  const frame = createFrame({ cutoff: maximumCount, definitionValue });
  const plotGroups = largeOutputGroups(definitionValue, counts);
  const wire = resultWire(frame, { plotGroups });
  wire.resourceUsage.actualInputBars = maximumCount;
  wire.resourceUsage.admittedInputBars = maximumCount;
  return defineCalculatedSeriesResult(wire, {
    definition: definitionValue,
    eligibleTimeline: Array.from({ length: maximumCount }, (_, index) => index + 1),
  });
}

function largeProfileDescriptor(index) {
  const descriptor = clone(readContributionProfileRegistry(registry).descriptors[0]);
  const longId = (prefix, entry) => `${prefix}.boundary-${index}-${entry}.${'a'.repeat(80)}`;
  descriptor.profileId = `analysis.large-${index}`;
  descriptor.definitionSchemaId = `https://replay-lab.local/${'s'.repeat(260)}-${index}`;
  descriptor.inputContractIds = Array.from({ length: 64 }, (_, entry) => longId('input', entry));
  descriptor.outputContractIds = Array.from({ length: 64 }, (_, entry) => longId('output', entry));
  descriptor.permittedCapabilityRanges = Array.from({ length: 64 }, (_, entry) => ({
    id: longId('capability', entry), range: '^1.0.0',
  }));
  return descriptor;
}

function migrationRefs() {
  const fromDefinitionRef = clone(documentFixture.workspacePanes[0].resolvedInstances[0].definitionRef);
  const toDefinitionRef = clone(fromDefinitionRef);
  toDefinitionRef.definitionVersion = '1.1.0';
  return { fromDefinitionRef, toDefinitionRef };
}

async function createMigrationPlan(original) {
  const { fromDefinitionRef, toDefinitionRef } = migrationRefs();
  const expectedCandidate = canonicalClone(original);
  expectedCandidate.parameterOverrides.sampleCount = expectedCandidate.parameterOverrides.fixtureLength;
  delete expectedCandidate.parameterOverrides.fixtureLength;
  expectedCandidate.definitionRef = canonicalClone(toDefinitionRef);
  const candidateDigest = await digestCanonical(expectedCandidate);
  const raw = {
    schemaVersion: 1,
    migrationId: 'synthetic-forward-migration',
    fromProfile: clone(fromDefinitionRef.profile),
    toProfile: clone(toDefinitionRef.profile),
    fromDefinitionRef,
    toDefinitionRef,
    fromDocumentSchemaVersion: 1,
    toDocumentSchemaVersion: 1,
    operations: [{
      kind: 'rename-parameter',
      fromParameterId: 'fixtureLength',
      toParameterId: 'sampleCount',
    }],
    expectedPlanDigest: fixedDigest('0'),
    expectedFixtureDigests: [candidateDigest],
  };
  const provisional = defineCalculatedSeriesMigrationPlan(raw);
  const { expectedPlanDigest: ignored, ...payload } = readCalculatedSeriesMigrationPlan(provisional);
  assert.equal(ignored, fixedDigest('0'));
  raw.expectedPlanDigest = await digestCanonical(payload);
  return defineCalculatedSeriesMigrationPlan(raw);
}

async function createMigrationOperationCatalogPlan(original) {
  const { fromDefinitionRef, toDefinitionRef } = migrationRefs();
  const source = canonicalClone(original);
  source.parameterOverrides = {
    enumMode: 'legacy',
    fixtureLength: 2,
    retiredValue: 9,
  };
  source.styleOverrides = [{
    plotGroupId: 'price-group',
    style: clone(definitionFixture.plotGroups[0].plots[0].style),
    targetId: 'line-output',
    targetKind: 'plot',
  }];
  const expectedCandidate = canonicalClone(source);
  expectedCandidate.parameterOverrides.sampleCount = 2;
  delete expectedCandidate.parameterOverrides.fixtureLength;
  expectedCandidate.parameterOverrides.defaultedValue = 7;
  expectedCandidate.parameterOverrides.quarantine = { legacyRetiredValue: 9 };
  delete expectedCandidate.parameterOverrides.retiredValue;
  expectedCandidate.parameterOverrides.enumMode = 'current';
  expectedCandidate.plotGroupPlacements[0].plotGroupId = 'price-group-v2';
  expectedCandidate.styleOverrides[0].plotGroupId = 'price-group-v2';
  expectedCandidate.styleOverrides[0].targetId = 'line-output-v2';
  expectedCandidate.styleOverrides[0].style.stroke.color = '#112233FF';
  expectedCandidate.definitionRef = canonicalClone(toDefinitionRef);
  const canonicalExpectedCandidate = canonicalClone(expectedCandidate);
  const operations = [
    { kind: 'rename-parameter', fromParameterId: 'fixtureLength', toParameterId: 'sampleCount' },
    { kind: 'set-default-if-absent', parameterId: 'defaultedValue', value: 7 },
    { kind: 'quarantine-retired-parameter', parameterId: 'retiredValue', quarantineId: 'legacyRetiredValue' },
    { kind: 'map-enum-value', parameterId: 'enumMode', fromValue: 'legacy', toValue: 'current' },
    { kind: 'rename-plot-group-id', fromPlotGroupId: 'price-group', toPlotGroupId: 'price-group-v2' },
    { kind: 'rename-plot-id', plotGroupId: 'price-group-v2', fromPlotId: 'line-output', toPlotId: 'line-output-v2' },
    { kind: 'map-style-token', targetId: 'line-output-v2', fromToken: '#33AABBFF', toToken: '#112233FF' },
  ];
  const raw = {
    schemaVersion: 1,
    migrationId: 'synthetic-operation-catalog-migration',
    fromProfile: clone(fromDefinitionRef.profile),
    toProfile: clone(toDefinitionRef.profile),
    fromDefinitionRef,
    toDefinitionRef,
    fromDocumentSchemaVersion: 1,
    toDocumentSchemaVersion: 1,
    operations,
    expectedPlanDigest: fixedDigest('0'),
    expectedFixtureDigests: [await digestCanonical(canonicalExpectedCandidate)],
  };
  const provisional = defineCalculatedSeriesMigrationPlan(raw);
  const { expectedPlanDigest: ignored, ...payload } = readCalculatedSeriesMigrationPlan(provisional);
  assert.equal(ignored, fixedDigest('0'));
  raw.expectedPlanDigest = await digestCanonical(payload);
  return {
    expectedCandidate: canonicalExpectedCandidate,
    plan: defineCalculatedSeriesMigrationPlan(raw),
    source,
  };
}

function runPositiveContracts() {
  const registryWire = readContributionProfileRegistry(registry);
  assertJsonRoundTrip(registryWire);
  assert.equal(registryWire.descriptors.length, 1);
  const descriptor = resolveContributionProfile(registry, calculatedSeriesProfileRef());
  assert.equal(readContributionProfileDescriptor(descriptor).profileId, 'analysis.calculated-series');
  assert.equal(assessContributionProfileCompatibility(descriptor, calculatedSeriesProfileRef()).compatible, true);
  const catalogWire = JSON.parse(fs.readFileSync(path.join(
    V7_ROOT, 'src/contribution-profile-contract/contribution-profile-catalog.json',
  ), 'utf8'));
  assert.deepEqual(readContributionProfileRegistry(createPinnedRegistry(catalogWire)), registryWire);
  const profileSchema = JSON.parse(fs.readFileSync(path.join(
    V7_ROOT, 'src/contribution-profile-contract/contribution-profile-registry.schema.json',
  ), 'utf8'));
  const calculatedSchema = JSON.parse(fs.readFileSync(path.join(
    V7_ROOT, 'src/calculated-series-contract/calculated-series-contract.schema.json',
  ), 'utf8'));
  assert.equal(profileSchema.$defs.descriptor.additionalProperties, false);
  assert.deepEqual(Object.keys(calculatedSchema.$defs).filter((key) => (
    [
      'contributionBinding', 'definition', 'frameIdentity', 'migrationPlan',
      'projectionFrame', 'result', 'workspaceDocument',
    ].includes(key)
  )).sort(), [
    'contributionBinding', 'definition', 'frameIdentity', 'migrationPlan',
    'projectionFrame', 'result', 'workspaceDocument',
  ]);
  for (const definitionName of [
    'contributionBinding', 'definition', 'frameIdentity', 'migrationPlan',
    'projectionFrame', 'result', 'workspaceDocument',
  ]) {
    assert.equal(
      calculatedSchema.$defs[definitionName].additionalProperties,
      false,
      `${definitionName} schema must be closed.`,
    );
  }
  assert.equal(calculatedSchema.$defs.migrationOperation.oneOf.length, 7);
  const plotCatalog = JSON.parse(fs.readFileSync(path.join(
    V7_ROOT, 'src/calculated-series-contract/calculated-series-plot-style-catalog.json',
  ), 'utf8'));
  assert.deepEqual(plotCatalog.plotKinds.map(({ kind }) => kind).sort(),
    ['area', 'band', 'baseline', 'histogram', 'line']);
  const scaleCatalog = JSON.parse(fs.readFileSync(path.join(
    V7_ROOT, 'src/calculated-series-contract/calculated-series-scale-catalog.json',
  ), 'utf8'));
  assert.deepEqual(readCalculatedSeriesScaleCatalog(), scaleCatalog);

  const definitionWire = readCalculatedSeriesDefinition(definition);
  assertJsonRoundTrip(definitionWire);
  const roundTrip = defineCalculatedSeriesDefinition(JSON.parse(JSON.stringify(definitionWire)), { profileRegistry: registry });
  assert.deepEqual(readCalculatedSeriesDefinition(roundTrip), definitionWire);
  assert.deepEqual(definitionWire.plotGroups.flatMap(({ plots }) => plots.map(({ kind }) => kind)).sort(),
    ['area', 'band', 'baseline', 'histogram', 'line']);
  assert.equal(definitionWire.plotGroups[0].referenceLines.length, 1);

  const binding = defineCalculatedSeriesContributionBinding(bindingWire(), { definition, profileRegistry: registry });
  const bindingValue = readCalculatedSeriesContributionBinding(binding);
  assert.equal(bindingValue.declaredKind, 'indicator');
  assertJsonRoundTrip(bindingValue);
  const document = defineCalculatedSeriesWorkspaceDocument(documentFixture, { definitions: [definition] });
  const documentWire = readCalculatedSeriesWorkspaceDocument(document);
  assertJsonRoundTrip(documentWire);
  assert.equal(documentWire.workspacePanes[0].chartRegions.filter(({ kind }) => kind === 'main').length, 1);
  assert.equal(documentWire.workspacePanes[0].unresolvedInstances[0].originalWire.unknownPortableField, 'retained');
  const reorderedDocument = clone(documentFixture);
  reorderedDocument.workspacePanes[0].chartRegions.reverse();
  reorderedDocument.workspacePanes[0].scaleGroups.reverse();
  reorderedDocument.workspacePanes[0].resolvedInstances[0].plotGroupPlacements.reverse();
  assert.deepEqual(
    readCalculatedSeriesWorkspaceDocument(defineCalculatedSeriesWorkspaceDocument(
      reorderedDocument,
      { definitions: [definition] },
    )),
    documentWire,
    'Equivalent identity/order collections must serialize canonically.',
  );

  const frame = createFrame();
  assertJsonRoundTrip(readCalculatedSeriesFrameIdentity(frame));
  const result = defineCalculatedSeriesResult(resultWire(frame), {
    definition,
    eligibleTimeline: [1_000, 2_000, 3_000],
  });
  const resultValue = readCalculatedSeriesResult(result);
  assertJsonRoundTrip(resultValue);
  assert.equal(resultValue.state, 'ready');
  assert.equal(resultValue.plotGroups[0].plots[2].points[2].value, 0, '-0 must normalize to zero');
  for (const state of ['unavailable', 'error']) {
    const value = readCalculatedSeriesResult(defineCalculatedSeriesResult(resultWire(frame, { state }), {
      definition, eligibleTimeline: [1_000, 2_000, 3_000],
    }));
    assert.equal(value.plotGroups.length, 0);
  }
  const empty = readCalculatedSeriesResult(defineCalculatedSeriesResult(
    resultWire(frame, { state: 'empty' }),
    { definition, eligibleTimeline: [] },
  ));
  assert.equal(empty.plotGroups.length, 0);
  const pending = defineCalculatedSeriesProjectionFrame(projectionWire(frame), {
    definition, eligibleTimeline: [1_000, 2_000, 3_000],
  });
  const pendingValue = readCalculatedSeriesProjectionFrame(pending);
  assert.equal(pendingValue.state, 'pending');
  assertJsonRoundTrip(pendingValue);
  assert.equal(assessCalculatedSeriesFrameCurrency({ candidate: frame, current: frame }).status, 'current');
  assert.equal(assessCalculatedSeriesFrameCurrency({
    candidate: frame,
    current: createFrame({ instanceRevision: 3 }),
  }).status, 'stale');

  const priceScale = definitionWire.plotGroups[0].scaleIntent;
  assert.equal(assessScaleIntentCompatibility(priceScale, clone(priceScale)).compatible, true);
  const fixedScale = clone(priceScale);
  fixedScale.domain = { kind: 'fixed', minimum: 1, maximum: 200 };
  const fixedScaleOther = clone(fixedScale);
  fixedScaleOther.domain.maximum = 201;
  assert.deepEqual(assessScaleIntentCompatibility(fixedScale, fixedScaleOther).conflicts, ['domain']);
  const scaleIntents = scaleCatalog.dimensions.map(scaleIntentFromCatalog);
  for (const [leftIndex, left] of scaleIntents.entries()) {
    for (const [rightIndex, right] of scaleIntents.entries()) {
      assert.equal(
        assessScaleIntentCompatibility(left, right).compatible,
        leftIndex === rightIndex,
        'Scale dimension/unit/formatter matrix must be structural.',
      );
    }
  }
  const logarithmic = clone(priceScale);
  logarithmic.transform = 'logarithmic';
  logarithmic.zeroPolicy = 'forbid-nonpositive';
  defineScaleIntent(logarithmic);
  assert.deepEqual(
    assessScaleIntentCompatibility(priceScale, logarithmic).conflicts,
    ['transform', 'zeroPolicy'],
  );
  const symmetric = clone(scaleIntents.find(({ dimension }) => (
    dimension.dimensionId === 'ratio.value'
  )));
  symmetric.domain = { kind: 'symmetric-around-zero', magnitude: 'auto' };
  symmetric.zeroPolicy = 'include';
  defineScaleIntent(symmetric);
  const formatterVariant = clone(priceScale);
  formatterVariant.formatter.options.decimals = 7;
  assert.deepEqual(
    assessScaleIntentCompatibility(priceScale, formatterVariant).conflicts,
    ['formatter'],
  );
  assert.equal(readCalculatedSeriesScaleCatalog().dimensions.length, 6);
  return { documentWire, frame, resultValue };
}

async function runMigrationPositive(documentWire) {
  const original = documentWire.workspacePanes[0].resolvedInstances[0];
  const originalSnapshot = JSON.stringify(original);
  const plan = await createMigrationPlan(original);
  assertJsonRoundTrip(readCalculatedSeriesMigrationPlan(plan));
  const refs = migrationRefs();
  assert.deepEqual(validateCalculatedSeriesMigrationChain([plan], {
    fromDefinitionRef: refs.fromDefinitionRef,
    fromDocumentSchemaVersion: 1,
    toDefinitionRef: refs.toDefinitionRef,
    toDocumentSchemaVersion: 1,
  }), { migrationIds: ['synthetic-forward-migration'], status: 'complete' });
  const evidence = await simulateCalculatedSeriesMigration(plan, original, { digestCanonical });
  assert.equal(evidence.status, 'simulated');
  assert.equal(evidence.candidate.parameterOverrides.sampleCount, 2);
  assert.equal(evidence.candidate.definitionRef.definitionVersion, '1.1.0');
  assert.equal(JSON.stringify(original), originalSnapshot, 'simulation must preserve original bytes');
  const document = defineCalculatedSeriesWorkspaceDocument(documentFixture, { definitions: [definition] });
  assert.deepEqual(await verifyCalculatedSeriesUnresolvedIntegrity(document, { digestCanonical }), {
    status: 'verified', verifiedInstanceIds: ['instance-unresolved'],
  });
  const catalog = await createMigrationOperationCatalogPlan(original);
  const catalogSourceSnapshot = JSON.stringify(catalog.source);
  const catalogEvidence = await simulateCalculatedSeriesMigration(
    catalog.plan,
    catalog.source,
    { digestCanonical },
  );
  assert.deepEqual(catalogEvidence.candidate, catalog.expectedCandidate);
  assert.equal(JSON.stringify(catalog.source), catalogSourceSnapshot);
  assert.deepEqual(
    readCalculatedSeriesMigrationPlan(catalog.plan).operations.map(({ kind }) => kind),
    [
      'rename-parameter', 'set-default-if-absent', 'quarantine-retired-parameter',
      'map-enum-value', 'rename-plot-group-id', 'rename-plot-id', 'map-style-token',
    ],
  );
  return { original, plan };
}

function mutationContext(frame) {
  return {
    document: () => clone(documentFixture),
    definition: () => clone(definitionFixture),
    output: () => resultWire(frame),
  };
}

async function runNegativeCase(testCase, context) {
  const { operation, expectedCode } = testCase;
  if (operation === 'package-registry') {
    expectCode(expectedCode, () => createContributionProfileRegistry({ descriptors: [], schemaVersion: 1 }, { authority: 'package' }));
  } else if (operation === 'kind-alone') {
    expectCode(expectedCode, () => defineCalculatedSeriesContributionBinding({ schemaVersion: 1, declaredKind: 'indicator' }, { definition, profileRegistry: registry }));
  } else if (operation === 'future-point') {
    const wire = context.output();
    wire.plotGroups[0].plots[0].points[0].displayEpochMs = 4_000;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'partial-output') {
    const wire = context.output();
    wire.plotGroups.pop();
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'stale-non-ready') {
    const wire = context.output();
    wire.state = 'unavailable';
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'empty-with-timeline') {
    const wire = context.output();
    wire.state = 'empty';
    wire.plotGroups = [];
    wire.resourceUsage.outputPoints = 0;
    wire.resourceUsage.outputBytes = Buffer.byteLength('[]');
    expectCode(expectedCode, () => defineCalculatedSeriesResult(
      wire,
      { definition, eligibleTimeline: [1_000, 2_000, 3_000] },
    ));
  } else if (operation === 'ready-without-timeline') {
    const wire = context.output();
    expectCode(expectedCode, () => defineCalculatedSeriesResult(
      wire,
      { definition, eligibleTimeline: [] },
    ));
  } else if (operation === 'scale-mismatch') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances[0].plotGroupPlacements[0].scaleGroupId = 'scale-ratio';
    wire.workspacePanes[0].resolvedInstances[0].plotGroupPlacements[0].regionId = 'region-secondary';
    wire.workspacePanes[0].resolvedInstances[0].plotGroupPlacements[0].order = 1;
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'collapsed-main') {
    const wire = context.document();
    wire.workspacePanes[0].chartRegions[0].collapsed = true;
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'forged-frame') {
    const wire = context.output();
    wire.frameIdentity = {};
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'invalid-band') {
    const wire = context.output();
    wire.plotGroups[0].plots[3].points[0].lower = 200;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'unknown-style') {
    const wire = context.definition();
    wire.plotGroups[0].plots[0].style.vendorOption = true;
    expectCode(expectedCode, () => defineCalculatedSeriesDefinition(wire, { profileRegistry: registry }));
  } else if (operation === 'diagnostic-limit') {
    const wire = context.output();
    wire.diagnostics = Array.from({ length: 129 }, () => diagnostics()[0]);
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'log-zero') {
    const scale = clone(definitionFixture.plotGroups[0].scaleIntent);
    scale.transform = 'logarithmic';
    expectCode(expectedCode, () => defineScaleIntent(scale));
  } else if (operation === 'native-unresolved') {
    const wire = context.document();
    wire.workspacePanes[0].unresolvedInstances[0].originalWire.native = new Date();
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'portable-accessor') {
    const wire = context.document();
    let invoked = false;
    Object.defineProperty(
      wire.workspacePanes[0].resolvedInstances[0].parameterOverrides,
      'executableValue',
      { enumerable: true, get: () => { invoked = true; return 1; } },
    );
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(
      wire,
      { definitions: [definition] },
    ));
    assert.equal(invoked, false, 'portable validation must never invoke accessors');
  } else if (operation === 'sparse-contract-array') {
    const wire = context.definition();
    wire.plotGroups = new Array(1);
    expectCode(expectedCode, () => defineCalculatedSeriesDefinition(
      wire,
      { profileRegistry: registry },
    ));
  } else if (operation === 'extra-context') {
    const wire = context.definition();
    wire.inputRequirement.additionalContexts = ['sibling-pane'];
    expectCode(expectedCode, () => defineCalculatedSeriesDefinition(wire, { profileRegistry: registry }));
  } else if (operation === 'insufficient-warmup-ready') {
    const definitionWire = context.definition();
    definitionWire.inputRequirement.insufficientWarmup = 'unavailable';
    const unavailableDefinition = defineCalculatedSeriesDefinition(
      definitionWire,
      { profileRegistry: registry },
    );
    const frame = createFrame({ definitionValue: unavailableDefinition });
    const wire = resultWire(frame);
    wire.provenance.warmupCoverage.providedBars = 1;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(
      wire,
      { definition: unavailableDefinition, eligibleTimeline: [1_000, 2_000, 3_000] },
    ));
  } else if (operation === 'unknown-profile') {
    expectCode(expectedCode, () => resolveContributionProfile(registry, defineContributionProfileRef({
      profileContractVersion: '1.0.0', profileId: 'analysis.unknown',
    })));
  } else if (operation === 'duplicate-profile') {
    const descriptor = clone(readContributionProfileRegistry(registry).descriptors[0]);
    expectCode(expectedCode, () => createPinnedRegistry({ descriptors: [descriptor, descriptor], schemaVersion: 1 }));
  } else if (operation === 'retired-profile') {
    const descriptor = clone(readContributionProfileRegistry(registry).descriptors[0]);
    descriptor.lifecycleStatus = 'retired';
    const retiredRegistry = createPinnedRegistry({ descriptors: [descriptor], schemaVersion: 1 });
    expectCode(expectedCode, () => resolveContributionProfile(retiredRegistry, calculatedSeriesProfileRef()));
  } else if (operation === 'deprecated-profile') {
    const descriptor = clone(readContributionProfileRegistry(registry).descriptors[0]);
    descriptor.lifecycleStatus = 'deprecated';
    const deprecatedRegistry = createPinnedRegistry({ descriptors: [descriptor], schemaVersion: 1 });
    expectCode(expectedCode, () => resolveContributionProfile(deprecatedRegistry, calculatedSeriesProfileRef()));
  } else if (operation === 'unversioned-registry-authority') {
    expectCode(expectedCode, () => createContributionProfileRegistry({
      descriptors: [], schemaVersion: 1,
    }));
  } else if (operation === 'foreign-binding') {
    const wire = bindingWire();
    wire.packageId = 'core.foreign-fixture';
    expectCode(expectedCode, () => defineCalculatedSeriesContributionBinding(wire, { definition, profileRegistry: registry }));
  } else if (operation === 'foreign-profile-binding') {
    const other = clone(readContributionProfileRegistry(registry).descriptors[0]);
    other.profileId = 'analysis.other-series';
    const twoProfileRegistry = createPinnedRegistry({
      descriptors: [readContributionProfileRegistry(registry).descriptors[0], other],
      schemaVersion: 1,
    });
    const wire = bindingWire();
    wire.profile = { profileContractVersion: '1.0.0', profileId: other.profileId };
    expectCode(expectedCode, () => defineCalculatedSeriesContributionBinding(
      wire,
      { definition, profileRegistry: twoProfileRegistry },
    ));
  } else if (operation === 'point-order') {
    const wire = context.output();
    wire.plotGroups[0].plots[0].points[1].displayEpochMs = 1_000;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'off-timeline') {
    const wire = context.output();
    wire.plotGroups[0].plots[0].points[1].displayEpochMs = 1_500;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'incomplete-timeline-coverage') {
    const wire = context.output();
    wire.plotGroups[0].plots[1].points.splice(1, 1);
    expectCode(expectedCode, () => defineCalculatedSeriesResult(
      wire,
      { definition, eligibleTimeline: [1_000, 2_000, 3_000] },
    ));
  } else if (operation === 'nonfinite-point') {
    const wire = context.output();
    wire.plotGroups[0].plots[0].points[0].value = Number.NaN;
    expectCode(expectedCode, () => defineCalculatedSeriesResult(wire, { definition, eligibleTimeline: [1_000, 2_000, 3_000] }));
  } else if (operation === 'placement-incomplete') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances[0].plotGroupPlacements.pop();
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'placement-order-duplicate') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances[0].plotGroupPlacements[1].regionId = 'region-main';
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(
      wire,
      { definitions: [definition] },
    ));
  } else if (operation === 'unresolved-digest') {
    const wire = context.document();
    wire.workspacePanes[0].unresolvedInstances[0].originalDigest = fixedDigest('a');
    const document = defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] });
    await expectCodeAsync(expectedCode, () => verifyCalculatedSeriesUnresolvedIntegrity(document, { digestCanonical }));
  } else if (operation === 'migration-downgrade') {
    const raw = clone(readCalculatedSeriesMigrationPlan(context.plan));
    raw.toDefinitionRef.definitionVersion = '0.9.0';
    expectCode(expectedCode, () => defineCalculatedSeriesMigrationPlan(raw));
  } else if (operation === 'migration-digest') {
    await expectCodeAsync(expectedCode, () => simulateCalculatedSeriesMigration(
      context.plan,
      context.original,
      { digestCanonical: async () => fixedDigest('f') },
    ));
  } else if (operation === 'migration-gap') {
    const refs = migrationRefs();
    refs.toDefinitionRef.definitionVersion = '1.2.0';
    expectCode(expectedCode, () => validateCalculatedSeriesMigrationChain([context.plan], {
      fromDefinitionRef: refs.fromDefinitionRef,
      fromDocumentSchemaVersion: 1,
      toDefinitionRef: refs.toDefinitionRef,
      toDocumentSchemaVersion: 1,
    }));
  } else if (operation === 'migration-ambiguity') {
    const refs = migrationRefs();
    expectCode(expectedCode, () => validateCalculatedSeriesMigrationChain(
      [context.plan, context.plan],
      {
        fromDefinitionRef: refs.fromDefinitionRef,
        fromDocumentSchemaVersion: 1,
        toDefinitionRef: refs.toDefinitionRef,
        toDocumentSchemaVersion: 1,
      },
    ));
  } else if (operation === 'migration-source') {
    const source = clone(context.original);
    source.definitionRef.definitionVersion = '0.9.0';
    await expectCodeAsync(expectedCode, () => simulateCalculatedSeriesMigration(
      context.plan, source, { digestCanonical },
    ));
  } else if (operation === 'registry-count') {
    const descriptor = readContributionProfileRegistry(registry).descriptors[0];
    const descriptors = Array.from({ length: 65 }, (_, index) => ({
      ...clone(descriptor), profileId: `analysis.fixture-${index}`,
    }));
    expectCode(expectedCode, () => createPinnedRegistry({ descriptors, schemaVersion: 1 }));
  } else if (operation === 'definition-groups') {
    const wire = context.definition();
    wire.plotGroups = Array.from({ length: 9 }, (_, index) => {
      const group = clone(definitionFixture.plotGroups[1]);
      group.plotGroupId = `group-${index}`;
      return group;
    });
    expectCode(expectedCode, () => defineCalculatedSeriesDefinition(wire, { profileRegistry: registry }));
  } else if (operation === 'definition-bytes') {
    const wire = context.definition();
    wire.parameterContract.schemaId = 'x'.repeat(270_000);
    expectCode(expectedCode, () => defineCalculatedSeriesDefinition(wire, { profileRegistry: registry }));
  } else if (operation === 'workspace-panes') {
    const wire = context.document();
    const pane = wire.workspacePanes[0];
    wire.workspacePanes = Array.from({ length: 9 }, (_, index) => ({
      ...clone(pane), workspacePaneId: `pane-${index}`,
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'chart-regions') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances = [];
    wire.workspacePanes[0].unresolvedInstances = [];
    wire.workspacePanes[0].scaleGroups = [];
    wire.workspacePanes[0].chartRegions = Array.from({ length: 9 }, (_, index) => ({
      collapsed: false,
      heightWeight: 10,
      kind: index === 0 ? 'main' : 'calculated-series',
      order: index,
      regionId: `region-${index}`,
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'scale-groups') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances = [];
    wire.workspacePanes[0].unresolvedInstances = [];
    wire.workspacePanes[0].chartRegions = [clone(documentFixture.workspacePanes[0].chartRegions[0])];
    const scale = clone(documentFixture.workspacePanes[0].scaleGroups[0]);
    wire.workspacePanes[0].scaleGroups = Array.from({ length: 5 }, (_, index) => ({
      ...clone(scale), order: index, scaleGroupId: `scale-${index}`,
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'workspace-instances') {
    const wire = context.document();
    const unresolved = wire.workspacePanes[0].unresolvedInstances[0];
    wire.workspacePanes[0].resolvedInstances = [];
    wire.workspacePanes[0].unresolvedInstances = Array.from({ length: 33 }, (_, index) => ({
      ...clone(unresolved), instanceId: `unresolved-${index}`,
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'portable-entries') {
    const wire = context.document();
    wire.workspacePanes[0].resolvedInstances[0].parameterOverrides = Object.fromEntries(
      Array.from({ length: 129 }, (_, index) => [`parameter-${index}`, index]),
    );
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'portable-depth') {
    const wire = context.document();
    let nested = 'leaf';
    for (let depth = 0; depth < 10; depth += 1) nested = { child: nested };
    wire.workspacePanes[0].resolvedInstances[0].parameterOverrides = { nested };
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'migration-operations') {
    const wire = clone(readCalculatedSeriesMigrationPlan(context.plan));
    wire.operations = Array.from({ length: 33 }, (_, index) => ({
      kind: 'set-default-if-absent', parameterId: `parameter-${index}`, value: index,
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesMigrationPlan(wire));
  } else if (operation === 'migration-bytes') {
    const wire = clone(readCalculatedSeriesMigrationPlan(context.plan));
    wire.operations = [{ kind: 'set-default-if-absent', parameterId: 'payload', value: 'x'.repeat(270_000) }];
    expectCode(expectedCode, () => defineCalculatedSeriesMigrationPlan(wire));
  } else if (operation === 'registry-bytes') {
    expectCode(expectedCode, () => createPinnedRegistry({
      descriptors: Array.from({ length: 64 }, (_, index) => largeProfileDescriptor(index)),
      schemaVersion: 1,
    }));
  } else if (operation === 'document-bytes') {
    const wire = context.document();
    const instance = wire.workspacePanes[0].resolvedInstances[0];
    wire.workspacePanes[0].unresolvedInstances = [];
    wire.workspacePanes[0].resolvedInstances = Array.from({ length: 32 }, (_, index) => ({
      ...clone(instance),
      instanceId: `large-instance-${index}`,
      parameterOverrides: { payload: 'x'.repeat(140_000) },
    }));
    expectCode(expectedCode, () => defineCalculatedSeriesWorkspaceDocument(wire, { definitions: [definition] }));
  } else if (operation === 'plot-points') {
    const largeDefinition = defineHighLimitFixture();
    expectCode(expectedCode, () => defineLargeResult(largeDefinition, [20_001, 0, 0, 0, 0]));
  } else if (operation === 'result-points') {
    const largeDefinition = defineHighLimitFixture({ extraPlot: true });
    expectCode(expectedCode, () => defineLargeResult(
      largeDefinition,
      [16_667, 16_667, 16_667, 16_667, 16_667, 16_667],
    ));
  } else if (operation === 'result-bytes') {
    const wire = context.output();
    wire.diagnostics[0].message = 'x'.repeat(17 * 1024 * 1024);
    expectCode(expectedCode, () => defineCalculatedSeriesResult(
      wire,
      { definition, eligibleTimeline: [1_000, 2_000, 3_000] },
    ));
  } else {
    assert.fail(`Unknown calculated-series negative operation: ${operation}`);
  }
}

function runCeilingEvidence(context) {
  assert.deepEqual(CALCULATED_SERIES_LIMITS, readJson('positive/limits.json'));
  const profileDescriptor = readContributionProfileRegistry(registry).descriptors[0];
  const profileBoundary = createPinnedRegistry({
    descriptors: Array.from({ length: 64 }, (_, index) => ({
      ...clone(profileDescriptor), profileId: `analysis.boundary-${index}`,
    })),
    schemaVersion: 1,
  });
  assert.equal(readContributionProfileRegistry(profileBoundary).descriptors.length, 64);
  let lastLargeRegistry = null;
  for (let count = 1; count <= 64; count += 1) {
    try {
      lastLargeRegistry = createPinnedRegistry({
        descriptors: Array.from({ length: count }, (_, index) => largeProfileDescriptor(index)),
        schemaVersion: 1,
      });
    } catch (error) {
      assert.equal(error.code, 'CONTRIBUTION_PROFILE_RESOURCE_LIMIT');
      break;
    }
  }
  assert.ok(Buffer.byteLength(JSON.stringify(readContributionProfileRegistry(lastLargeRegistry))) > 200_000,
    'registry byte boundary must have a near-limit positive fixture');

  const group = clone(definitionFixture.plotGroups[0]);
  group.plots = Array.from({ length: 8 }, (_, index) => ({
    ...clone(group.plots[0]), plotId: `line-${index}`,
  }));
  assert.equal(definePlotGroup(group).plots.length, 8);
  group.plots.push({ ...clone(group.plots[0]), plotId: 'line-8' });
  expectCode('CALCULATED_SERIES_RESOURCE_LIMIT', () => definePlotGroup(group));

  const references = clone(definitionFixture.plotGroups[0]);
  references.referenceLines = Array.from({ length: 16 }, (_, index) => ({
    ...clone(references.referenceLines[0]), referenceLineId: `reference-${index}`,
  }));
  assert.equal(definePlotGroup(references).referenceLines.length, 16);
  references.referenceLines.push({ ...clone(references.referenceLines[0]), referenceLineId: 'reference-16' });
  expectCode('CALCULATED_SERIES_RESOURCE_LIMIT', () => definePlotGroup(references));

  const groupBoundary = clone(definitionFixture);
  groupBoundary.plotGroups = Array.from({ length: 8 }, (_, index) => {
    const value = clone(definitionFixture.plotGroups[1]);
    value.plotGroupId = `boundary-group-${index}`;
    value.plots[0].plotId = `boundary-plot-${index}`;
    return value;
  });
  assert.equal(readCalculatedSeriesDefinition(defineCalculatedSeriesDefinition(
    groupBoundary,
    { profileRegistry: registry },
  )).plotGroups.length, 8);

  const plotBoundary = clone(definitionFixture);
  plotBoundary.plotGroups = Array.from({ length: 4 }, (_, groupIndex) => {
    const value = clone(definitionFixture.plotGroups[0]);
    value.plotGroupId = `plot-boundary-group-${groupIndex}`;
    value.referenceLines = [];
    value.plots = Array.from({ length: 8 }, (_, plotIndex) => ({
      ...clone(definitionFixture.plotGroups[0].plots[0]),
      plotId: `plot-${groupIndex}-${plotIndex}`,
    }));
    return value;
  });
  assert.equal(readCalculatedSeriesDefinition(defineCalculatedSeriesDefinition(
    plotBoundary,
    { profileRegistry: registry },
  )).plotGroups.flatMap(({ plots }) => plots).length, 32);

  const paneBoundary = clone(documentFixture);
  const pane = paneBoundary.workspacePanes[0];
  pane.resolvedInstances = [];
  pane.unresolvedInstances = [];
  paneBoundary.workspacePanes = Array.from({ length: 8 }, (_, index) => ({
    ...clone(pane), workspacePaneId: `boundary-pane-${index}`,
  }));
  assert.equal(readCalculatedSeriesWorkspaceDocument(defineCalculatedSeriesWorkspaceDocument(
    paneBoundary, { definitions: [definition] },
  )).workspacePanes.length, 8);

  const regionBoundary = clone(documentFixture);
  regionBoundary.workspacePanes[0].resolvedInstances = [];
  regionBoundary.workspacePanes[0].unresolvedInstances = [];
  regionBoundary.workspacePanes[0].scaleGroups = [];
  regionBoundary.workspacePanes[0].chartRegions = Array.from({ length: 8 }, (_, index) => ({
    collapsed: false,
    heightWeight: 10,
    kind: index === 0 ? 'main' : 'calculated-series',
    order: index,
    regionId: `boundary-region-${index}`,
  }));
  assert.equal(readCalculatedSeriesWorkspaceDocument(defineCalculatedSeriesWorkspaceDocument(
    regionBoundary, { definitions: [definition] },
  )).workspacePanes[0].chartRegions.length, 8);

  const scaleBoundary = clone(documentFixture);
  scaleBoundary.workspacePanes[0].resolvedInstances = [];
  scaleBoundary.workspacePanes[0].unresolvedInstances = [];
  scaleBoundary.workspacePanes[0].chartRegions = [clone(documentFixture.workspacePanes[0].chartRegions[0])];
  const priceScale = documentFixture.workspacePanes[0].scaleGroups[0];
  scaleBoundary.workspacePanes[0].scaleGroups = Array.from({ length: 4 }, (_, index) => ({
    ...clone(priceScale), order: index, scaleGroupId: `boundary-scale-${index}`,
  }));
  assert.equal(readCalculatedSeriesWorkspaceDocument(defineCalculatedSeriesWorkspaceDocument(
    scaleBoundary, { definitions: [definition] },
  )).workspacePanes[0].scaleGroups.length, 4);

  const instanceBoundary = clone(documentFixture);
  const unresolved = instanceBoundary.workspacePanes[0].unresolvedInstances[0];
  instanceBoundary.workspacePanes[0].resolvedInstances = [];
  instanceBoundary.workspacePanes[0].unresolvedInstances = Array.from({ length: 32 }, (_, index) => ({
    ...clone(unresolved), instanceId: `boundary-instance-${index}`,
  }));
  assert.equal(readCalculatedSeriesWorkspaceDocument(defineCalculatedSeriesWorkspaceDocument(
    instanceBoundary, { definitions: [definition] },
  )).workspacePanes[0].unresolvedInstances.length, 32);

  const portableBoundary = clone(documentFixture);
  portableBoundary.workspacePanes[0].resolvedInstances[0].parameterOverrides = Object.fromEntries(
    Array.from({ length: 128 }, (_, index) => [`parameter-${index}`, index]),
  );
  defineCalculatedSeriesWorkspaceDocument(portableBoundary, { definitions: [definition] });
  let nested = 'leaf';
  for (let depth = 0; depth < 7; depth += 1) nested = { child: nested };
  portableBoundary.workspacePanes[0].resolvedInstances[0].parameterOverrides = { nested };
  defineCalculatedSeriesWorkspaceDocument(portableBoundary, { definitions: [definition] });

  const diagnosticBoundary = defineCalculatedSeriesResult(resultWire(createFrame(), {
    diagnosticValues: Array.from({ length: 128 }, () => diagnostics()[0]),
  }), { definition, eligibleTimeline: [1_000, 2_000, 3_000] });
  assert.equal(readCalculatedSeriesResult(diagnosticBoundary).diagnostics.length, 128);

  const largeResult = defineLargeResult(defineHighLimitFixture(), [20_000, 20_000, 20_000, 20_000, 20_000]);
  assert.equal(readCalculatedSeriesResult(largeResult).resourceUsage.outputPoints, 100_000);
  assert.ok(Buffer.byteLength(JSON.stringify(readCalculatedSeriesResult(largeResult)))
    <= CALCULATED_SERIES_LIMITS.maximumResultBytes);

  const migrationBoundary = clone(readCalculatedSeriesMigrationPlan(context.plan));
  migrationBoundary.operations = Array.from({ length: 32 }, (_, index) => ({
    kind: 'set-default-if-absent', parameterId: `boundary-${index}`, value: index,
  }));
  assert.equal(readCalculatedSeriesMigrationPlan(defineCalculatedSeriesMigrationPlan(
    migrationBoundary,
  )).operations.length, 32);
  migrationBoundary.operations = [{
    kind: 'set-default-if-absent', parameterId: 'payload', value: 'x'.repeat(240_000),
  }];
  defineCalculatedSeriesMigrationPlan(migrationBoundary);

  const unresolvedBoundary = clone(documentFixture);
  unresolvedBoundary.workspacePanes[0].unresolvedInstances[0].originalWire.payload = 'x'.repeat(65_000);
  defineCalculatedSeriesWorkspaceDocument(unresolvedBoundary, { definitions: [definition] });

  const documentBoundary = clone(documentFixture);
  const resolved = documentBoundary.workspacePanes[0].resolvedInstances[0];
  documentBoundary.workspacePanes[0].unresolvedInstances = [];
  documentBoundary.workspacePanes[0].resolvedInstances = Array.from({ length: 28 }, (_, index) => ({
    ...clone(resolved),
    instanceId: `document-boundary-${index}`,
    parameterOverrides: { payload: 'x'.repeat(140_000) },
  }));
  const nearLimitDocument = readCalculatedSeriesWorkspaceDocument(
    defineCalculatedSeriesWorkspaceDocument(documentBoundary, { definitions: [definition] }),
  );
  assert.ok(Buffer.byteLength(JSON.stringify(nearLimitDocument))
    <= CALCULATED_SERIES_LIMITS.maximumDocumentBytes);

  const unresolvedOversize = clone(documentFixture);
  unresolvedOversize.workspacePanes[0].unresolvedInstances[0].originalWire.payload = 'x'.repeat(65_536);
  expectCode('CALCULATED_SERIES_RESOURCE_LIMIT', () => defineCalculatedSeriesWorkspaceDocument(
    unresolvedOversize,
    { definitions: [definition] },
  ));
}

function runArchitectureAndRegressionEvidence() {
  const moduleDirectories = ['contribution-profile-contract', 'calculated-series-contract'];
  const forbiddenImports = [
    'chart', 'bar-data-runtime', 'replay-runtime', 'workspace-state-runtime', 'module-host',
    'plugin-package', 'persistence', 'worker_threads', 'node:fs', 'node:net', 'node:http',
  ];
  const forbiddenRuntimePatterns = [
    /\bfetch\s*\(/u, /\bnew\s+(?:Worker|SharedWorker|WebSocket)\b/u,
    /\b(?:document|window)\s*\.(?:body|create|query|get|addEventListener)/u,
    /\b(?:localStorage|indexedDB)\s*\./u,
    /\bset(?:Timeout|Interval)\s*\(/u,
  ];
  for (const directory of moduleDirectories) {
    const root = path.join(V7_ROOT, 'src', directory);
    for (const file of fs.readdirSync(root).filter((name) => name.endsWith('.js'))) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const imports = [...source.matchAll(/^import[^;]+from\s+['"]([^'"]+)['"]/gmu)]
        .map((match) => match[1]);
      assert.equal(imports.some((specifier) => forbiddenImports.some((token) => specifier.includes(token))), false,
        `${directory}/${file} must not import runtime/native owners`);
      assert.equal(forbiddenRuntimePatterns.some((pattern) => pattern.test(source)), false,
        `${directory}/${file} must remain free of runtime/native calls`);
    }
  }

  const hashes = {
    'sdk/plugin/catalogs/capabilities.json': '917548d99499308b0ed10dea4867a7cfebc803b7141a9ca6a4b328524e154dcd',
    'sdk/plugin/catalogs/contract-profiles.json': '6ce5e8bae5ebc08ca5609afc6d519b47c20998b8218f8561babadfc5a7c69345',
    'sdk/plugin/catalogs/contributions.json': '7dc5bcde2490212f2d050585b4395f88180950a2fba28fbc9d16006b52d004e1',
    'src/plugin-contract/local-plugin-package-manifest.schema.json': '7126e7f782d009b3d857b084407c907d31a97b768a8dc84612b44a5a28b3da92',
    'src/plugin-contract/plugin-manifest.schema.json': '11d5d7ab207c61d6d96f9ce74f9ee29a8fcde881d3df2920390d82aa9e959be2',
    'tools/plugin-developer-kit/domain/compatibility.js': '51b9e80d0adf5e674dd94fa5b717a38c509356f4a07b8ef0e37d4e46a1f98457',
  };
  for (const [relativePath, expected] of Object.entries(hashes)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(V7_ROOT, relativePath))).digest('hex');
    assert.equal(actual, expected, `${relativePath} must remain unchanged by the pure slice`);
  }
  const rules = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-harness-rules.json'), 'utf8'));
  const h117 = rules.rules.find(({ id }) => id === 'H117');
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(h117)).digest('hex'),
    '2e583ad697a75d3c6f66f2352fc29f019f5523720cbc13f71437bfb922e8f479',
    'H117 record must remain byte-semantically unchanged');
  assert.deepEqual({
    acceptanceEvidence: h117.acceptanceEvidence,
    humanReviewRequired: h117.humanReviewRequired,
    state: h117.state,
  }, { acceptanceEvidence: null, humanReviewRequired: true, state: 'executable' });
}

const positive = runPositiveContracts();
const migration = await runMigrationPositive(positive.documentWire);
const context = { ...mutationContext(positive.frame), ...migration };
const negativeFixture = readJson('negative/cases.json');
for (const testCase of negativeFixture.cases) await runNegativeCase(testCase, context);
runCeilingEvidence(context);
runArchitectureAndRegressionEvidence();

console.log(JSON.stringify({
  catalogs: { plotKinds: 5, scaleDimensions: 6 },
  contractRoundTrips: ['profile', 'definition', 'binding', 'workspace-document', 'result', 'projection-frame', 'migration'],
  harness: 'H118',
  h117State: 'unchanged-executable-human-review-required',
  negativeControls: negativeFixture.cases.map(({ name }) => name),
  scope: 'P1c.1-calculated-series-pure-contracts-only',
  status: 'passed',
  visualReviewRequired: false,
}));
