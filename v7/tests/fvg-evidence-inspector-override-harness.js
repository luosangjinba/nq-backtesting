import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as evidenceContract from '../src/annotation-evidence-resolver/public.js';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
} from '../src/annotation-chart-projection/public.js';
import { createSemanticArtifactInspectorController } from '../src/annotation-interaction/public.js';
import {
  createAnnotationRuntime,
  createRestoredAnnotationRuntime,
} from '../src/annotation-runtime/public.js';
import {
  AnnotationSemanticPackageError,
  createSemanticPackageRegistry,
  defineSemanticPackage,
  defineSemanticType,
} from '../src/annotation-semantic-registry/public.js';
import {
  createAnnotationStorageAdapter,
  createDurableAnnotationRepository,
} from '../src/annotation-persistence/public.js';
import {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
  FAIR_VALUE_GAP_TYPE_ID,
} from '../src/semantic-fair-value-gap/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const OBSERVED_AT = BASE + (7 * MINUTE);
const CREATED_AT = BASE + (8 * MINUTE);
const sessionId = createSessionId('session.r13-10d');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/fvg-evidence-inspector-override/negative/cases.json',
), 'utf8'));

function sourceBars() {
  const values = [
    { close: 100.5, high: 101, low: 99, open: 100, volume: 11 },
    { close: 104, high: 105, low: 100, open: 100.5, volume: 18 },
    { close: 105, high: 106, low: 103, open: 104, volume: 14 },
  ];
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    endEpochMs: BASE + ((index + 5) * MINUTE),
    startEpochMs: BASE + ((index + 4) * MINUTE),
  })));
}

function resolvedEvidence() {
  const bars = sourceBars();
  const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 41,
    artifacts: [],
    bars,
    datasetRevision: 'dataset.r13-10d',
    displayTimeframeId: 'timeframe.1m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-1m',
    replayCutoffEpochMs: OBSERVED_AT,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
  });
  return evidenceContract.resolveAnnotationEvidence({
    requirement: evidenceContract.createAnnotationEvidenceRequirement({
      followingBars: 1,
      maximumArtifactReferences: 0,
      precedingBars: 1,
      schemaVersion: 1,
    }),
    selection: evidenceContract.createAnnotationEvidenceSelection({
      artifactReferences: [],
      barStartEpochMs: bars[1].startEpochMs,
      schemaVersion: 1,
    }),
    snapshot,
  });
}

function fvgPackage() {
  return createFairValueGapSemanticPackage({ evidenceContract, geometryContract });
}

function registry() {
  return createSemanticPackageRegistry({
    availableCapabilities: [
      'annotation.evidence.bundle',
      'annotation.geometry.rectangle',
      'annotation.geometry.segment',
    ],
    packages: [fvgPackage()],
  });
}

function constructionDraft(owner, artifactId = 'artifact.fvg-inspected') {
  return owner.constructArtifactDraft({
    artifactId,
    construction: {
      createdAtEpochMs: CREATED_AT,
      evidence: resolvedEvidence(),
      mode: 'evidence-derived',
      sessionId,
    },
    typeId: FAIR_VALUE_GAP_TYPE_ID,
    typeVersion: '1.0.0',
  });
}

async function fixture({ repository = createFakeAnnotationRepository() } = {}) {
  const owner = registry();
  await owner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  const runtime = createAnnotationRuntime({
    geometryContract,
    repository,
    semanticContract: owner,
    sessionId,
  });
  await runtime.createSemanticArtifact({
    draft: constructionDraft(owner),
    expectedDocumentRevision: 0,
    sessionId,
  });
  return Object.freeze({ owner, repository, runtime });
}

function revisionDraft(owner, artifact, fields, overrides = {}) {
  return owner.createArtifactRevisionDraft({
    artifact,
    revision: {
      editedAtEpochMs: CREATED_AT + MINUTE,
      editorId: 'trader.leo',
      fields,
      replayCutoffEpochMs: OBSERVED_AT,
      ...overrides,
    },
  });
}

function fieldMap(inspection) {
  return new Map(inspection.groups.flatMap((group) => group.fields).map((field) => [field.id, field]));
}

async function capture(action, label = 'operation') {
  try { await action(); } catch (error) { return error; }
  assert.fail(`Expected ${label} to fail.`);
}

const primary = await fixture();
let artifact = primary.runtime.getSemanticArtifact('artifact.fvg-inspected');
const beforeInspection = primary.owner.inspectArtifactAtReplayCutoff(artifact, OBSERVED_AT - 1);
assert.equal(beforeInspection.visibility.status, 'hidden-before-observation');
assert.equal(beforeInspection.groups.length, 0);
const observedInspection = primary.owner.inspectArtifactAtReplayCutoff(artifact, OBSERVED_AT);
assert.equal(observedInspection.visibility.status, 'visible');
assert.deepEqual(observedInspection.groups.map(({ id }) => id), ['semantic', 'evidence', 'history']);
let inspectedFields = fieldMap(observedInspection);
assert.equal(inspectedFields.get('lowerPrice').readOnly, false);
assert.equal(inspectedFields.get('upperPrice').readOnly, false);
assert.equal(inspectedFields.get('midpointPrice').readOnly, true);
assert.equal(inspectedFields.get('lowerPrice').source, 'AUTO');
assert.deepEqual(inspectedFields.get('lowerPrice').control, {
  kind: 'number', max: 103, min: 101,
});
assert.equal(inspectedFields.get('sourceBars').value.length, 3);
const laterInspection = primary.owner.inspectArtifactAtReplayCutoff(artifact, OBSERVED_AT + MINUTE);
assert.equal(fieldMap(laterInspection).get('lowerPrice').readOnly, true);
assert.equal(fieldMap(laterInspection).get('editState').value, 'Return to observation cutoff to edit');

const overrideDraft = revisionDraft(primary.owner, artifact, {
  lowerPrice: 101.25,
  upperPrice: 102.75,
});
const previewInputs = primary.owner.projectionInputsForArtifactRevisionDraft(
  overrideDraft,
  { replayCutoffEpochMs: OBSERVED_AT },
);
assert.equal(previewInputs.length, 2);
assert.equal(previewInputs[0].geometry.payload.lowPrice, 101.25);
assert.equal(previewInputs[0].geometry.payload.highPrice, 102.75);
assert.equal(previewInputs[1].geometry.payload.startAnchor.price, 102);
await primary.runtime.reviseSemanticArtifact({
  draft: overrideDraft,
  expectedArtifactRevision: 1,
  expectedDocumentRevision: 1,
  sessionId,
});
artifact = primary.runtime.getSemanticArtifact('artifact.fvg-inspected');
assert.equal(artifact.revision, 2);
assert.equal(artifact.attributes.lowerPrice.baselineValue, 101);
assert.equal(artifact.attributes.lowerPrice.effectiveValue, 101.25);
assert.equal(artifact.attributes.midpointPrice.effectiveValue, 102);
assert.equal(artifact.attributes.upperPrice.effectiveValue, 102.75);
assert.equal(artifact.attributes.lowerPrice.effectiveSource, 'override');
assert.equal(artifact.attributes.lowerPrice.overrideProvenance.events.length, 1);
assert.equal(artifact.attributes.lowerPrice.overrideProvenance.events[0].sourceArtifactRevision, 1);
assert.equal(artifact.attributes.lowerPrice.overrideProvenance.events[0].editorId, 'trader.leo');
assert.equal(
  JSON.stringify(artifact.attributes.lowerPrice.overrideProvenance),
  JSON.stringify(artifact.attributes.midpointPrice.overrideProvenance),
);
assert.equal(
  JSON.stringify(artifact.attributes.lowerPrice.overrideProvenance),
  JSON.stringify(artifact.attributes.upperPrice.overrideProvenance),
);
inspectedFields = fieldMap(primary.owner.inspectArtifactAtReplayCutoff(artifact, OBSERVED_AT));
assert.equal(inspectedFields.get('lowerPrice').source, 'OVERRIDDEN');
assert.equal(inspectedFields.get('overrideCount').value, 1);

const resetDraft = revisionDraft(primary.owner, artifact, {
  lowerPrice: 101,
  upperPrice: 103,
}, { editedAtEpochMs: CREATED_AT + (2 * MINUTE) });
await primary.runtime.reviseSemanticArtifact({
  draft: resetDraft,
  expectedArtifactRevision: 2,
  expectedDocumentRevision: 2,
  sessionId,
});
artifact = primary.runtime.getSemanticArtifact('artifact.fvg-inspected');
assert.equal(artifact.revision, 3);
assert.equal(artifact.attributes.lowerPrice.effectiveSource, 'derived');
assert.equal(artifact.attributes.lowerPrice.overrideProvenance.events.length, 2);
assert.equal(artifact.attributes.lowerPrice.overrideProvenance.events[1].sourceArtifactRevision, 2);
await primary.runtime.undo({ expectedDocumentRevision: 3, sessionId });
artifact = primary.runtime.getSemanticArtifact('artifact.fvg-inspected');
assert.equal(artifact.revision, 2);
assert.equal(artifact.attributes.lowerPrice.effectiveValue, 101.25);
await primary.runtime.redo({ expectedDocumentRevision: 4, sessionId });
artifact = primary.runtime.getSemanticArtifact('artifact.fvg-inspected');
assert.equal(artifact.revision, 3);
assert.equal(artifact.attributes.lowerPrice.effectiveSource, 'derived');

function transientProjection({ previewRevision, subject }) {
  return createAnnotationProjection({
    entityId: subject.entityId,
    geometry: subject.geometry,
    presentation: subject.presentation,
    projectionId: subject.projectionId,
    revision: previewRevision,
  });
}

async function controllerFixture({ adapter = createFakeAnnotationPrimitiveAdapter() } = {}) {
  const value = await fixture();
  const previewPort = createChartAnnotationPreviewPort({ primitiveAdapter: adapter });
  let clock = CREATED_AT + (3 * MINUTE);
  const controller = createSemanticArtifactInspectorController({
    artifactPort: {
      readArtifact: async ({ artifactId }) => Object.freeze({
        artifact: value.runtime.getSemanticArtifact(artifactId),
        documentRevision: value.runtime.getDocument().revision,
      }),
      reviseArtifact: (input) => value.runtime.reviseSemanticArtifact({ ...input, sessionId }),
    },
    createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
    editorId: 'trader.controller',
    nowEpochMs: () => clock++,
    previewPort,
    projectPreview: transientProjection,
    semanticRegistryPort: value.owner,
  });
  return Object.freeze({ adapter, controller, owner: value.owner, previewPort, runtime: value.runtime });
}

const controlled = await controllerFixture();
await controlled.controller.select({
  artifactId: 'artifact.fvg-inspected',
  replayCutoffEpochMs: OBSERVED_AT,
});
assert.equal(controlled.controller.snapshot().status, 'selected');
assert.equal(controlled.controller.snapshot().groups.length, 3);
await controlled.controller.updateDraft({
  expectedDraftRevision: 1,
  field: 'lowerPrice',
  value: 101.25,
});
assert.equal(controlled.controller.snapshot().dirty, true);
assert.equal(controlled.previewPort.snapshot().projectionCount, 2);
await controlled.controller.updateDraft({
  expectedDraftRevision: 2,
  field: 'upperPrice',
  value: 102.75,
});
assert.equal(controlled.controller.snapshot().fieldValues.upperPrice, 102.75);
await controlled.controller.cancel();
assert.equal(controlled.previewPort.snapshot().projectionCount, 0);
assert.equal(controlled.runtime.getDocument().revision, 1);
await controlled.controller.select({
  artifactId: 'artifact.fvg-inspected', replayCutoffEpochMs: OBSERVED_AT,
});
await controlled.controller.updateDraft({
  expectedDraftRevision: 1, field: 'lowerPrice', value: 101.25,
});
await controlled.controller.updateDraft({
  expectedDraftRevision: 2, field: 'upperPrice', value: 102.75,
});
await controlled.controller.save();
assert.equal(controlled.runtime.getDocument().revision, 2);
assert.equal(controlled.runtime.getSemanticArtifact('artifact.fvg-inspected')
  .attributes.upperPrice.effectiveValue, 102.75);
assert.equal(controlled.previewPort.snapshot().projectionCount, 0);
await controlled.controller.select({
  artifactId: 'artifact.fvg-inspected', replayCutoffEpochMs: OBSERVED_AT,
});
await controlled.controller.resetDraft();
assert.equal(controlled.controller.snapshot().dirty, true);
assert.equal(controlled.controller.snapshot().fieldValues.lowerPrice, 101);
await controlled.controller.save();
assert.equal(controlled.runtime.getSemanticArtifact('artifact.fvg-inspected')
  .attributes.lowerPrice.effectiveSource, 'derived');

const rollbackAdapter = createFakeAnnotationPrimitiveAdapter({ failAt: 'update:1:after' });
const rollbackController = await controllerFixture({ adapter: rollbackAdapter });
await rollbackController.controller.select({
  artifactId: 'artifact.fvg-inspected', replayCutoffEpochMs: OBSERVED_AT,
});
await rollbackController.controller.updateDraft({
  expectedDraftRevision: 1, field: 'lowerPrice', value: 101.25,
});
const previewBeforeFailure = rollbackController.controller.snapshot();
const previewFailure = await capture(() => rollbackController.controller.updateDraft({
  expectedDraftRevision: 2, field: 'upperPrice', value: 102.75,
}));
assert.equal(previewFailure.code, 'ANNOTATION_SEMANTIC_INSPECTOR_OPERATION_FAILED');
assert.deepEqual(
  rollbackController.controller.snapshot().fieldValues,
  previewBeforeFailure.fieldValues,
  'failed Preview update must retain the prior local draft',
);
assert.equal(rollbackController.previewPort.snapshot().projectionCount, 2);
assert.equal(rollbackAdapter.inspect().handles[0].projection.revision, 1);
await rollbackController.controller.cancel();
assert.equal(rollbackController.previewPort.snapshot().projectionCount, 0);

function secondFinalizeFailureRepository() {
  let finalizeCount = 0;
  let visible = null;
  return Object.freeze({
    prepare({ candidateDocument }) {
      const previous = visible;
      return Object.freeze({
        async apply() { visible = candidateDocument; },
        async finalize() {
          finalizeCount += 1;
          if (finalizeCount === 2) throw new Error('intentional R13.10d finalize failure');
        },
        async rollback() { visible = previous; },
        snapshot: () => Object.freeze({ finalizeCount }),
      });
    },
  });
}

const durableRollback = await fixture({ repository: secondFinalizeFailureRepository() });
const beforeFailedRevision = durableRollback.runtime.getDocument();
const rollbackDraft = revisionDraft(
  durableRollback.owner,
  durableRollback.runtime.getSemanticArtifact('artifact.fvg-inspected'),
  { lowerPrice: 101.25, upperPrice: 102.75 },
);
const durableFailure = await capture(() => durableRollback.runtime.reviseSemanticArtifact({
  draft: rollbackDraft,
  expectedArtifactRevision: 1,
  expectedDocumentRevision: 1,
  sessionId,
}));
assert.equal(durableFailure.code, 'ANNOTATION_TRANSACTION_FAILED');
assert.equal(durableRollback.runtime.getDocument(), beforeFailedRevision);

const durableStorage = createMemoryWebStorage();
const durableRepository = createDurableAnnotationRepository({
  namespace: 'test.annotation.r13-10d',
  storage: createAnnotationStorageAdapter(durableStorage),
});
const durableOwner = registry();
await durableOwner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
let durableRuntime = await createRestoredAnnotationRuntime({
  geometryContract, repository: durableRepository, semanticContract: durableOwner, sessionId,
});
await durableRuntime.createSemanticArtifact({
  draft: constructionDraft(durableOwner, 'artifact.fvg-durable-override'),
  expectedDocumentRevision: 0,
  sessionId,
});
const durableDraft = revisionDraft(
  durableOwner,
  durableRuntime.getSemanticArtifact('artifact.fvg-durable-override'),
  { lowerPrice: 101.5, upperPrice: 102.5 },
);
await durableRuntime.reviseSemanticArtifact({
  draft: durableDraft,
  expectedArtifactRevision: 1,
  expectedDocumentRevision: 1,
  sessionId,
});
const exportedOverride = await durableRuntime.exportDocument();
await durableRuntime.dispose();
durableRuntime = await createRestoredAnnotationRuntime({
  geometryContract, repository: durableRepository, semanticContract: durableOwner, sessionId,
});
assert.equal(durableRuntime.getSemanticArtifact('artifact.fvg-durable-override')
  .attributes.lowerPrice.effectiveValue, 101.5);
assert.equal(await durableRuntime.exportDocument(), exportedOverride);
const importOwner = registry();
await importOwner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
const importRepository = createDurableAnnotationRepository({
  namespace: 'test.annotation.r13-10d-import',
  storage: createAnnotationStorageAdapter(createMemoryWebStorage()),
});
const importedRuntime = createAnnotationRuntime({
  geometryContract,
  repository: importRepository,
  semanticContract: importOwner,
  sessionId,
});
await importedRuntime.importDocument({
  expectedDocumentRevision: 0,
  payload: exportedOverride,
  sessionId,
});
assert.equal(importedRuntime.getSemanticArtifact('artifact.fvg-durable-override')
  .attributes.lowerPrice.overrideProvenance.events.length, 1);
assert.equal(importOwner.projectionInputsForArtifact(
  importedRuntime.getSemanticArtifact('artifact.fvg-durable-override'),
)[0].geometry.payload.lowPrice, 101.5);

function malformedInspectorPackage(packageId, inspect) {
  return defineSemanticPackage({
    activate: async () => Object.freeze({ dispose: async () => {} }),
    geometryDependencies: [],
    hostContractVersion: '1.0.0',
    packageId,
    packageVersion: '1.0.0',
    requiredCapabilities: [],
    semanticTypes: [defineSemanticType({
      construct: () => ({
        attributes: {},
        presentation: null,
        provenance: { observedAtReplayCutoffEpochMs: 1 },
        relations: [],
        sourceDrawing: null,
      }),
      definitionId: `${packageId}.definition`,
      definitionVersion: '1.0.0',
      displayMetadata: { label: 'Malformed' },
      inspect,
      project: () => [],
      typeId: `${packageId}.type`,
      version: '1.0.0',
    })],
    toolDescriptors: [],
  });
}

async function malformedInspection(packageId, inspect) {
  const owner = createSemanticPackageRegistry({ packages: [malformedInspectorPackage(packageId, inspect)] });
  await owner.enablePackage(packageId);
  const record = owner.readArtifactDraft(owner.constructArtifactDraft({
    artifactId: `artifact.${packageId}`,
    construction: {},
    typeId: `${packageId}.type`,
    typeVersion: '1.0.0',
  }));
  try {
    return owner.inspectArtifactAtReplayCutoff({
      ...record, revision: 1, status: 'active',
    }, 1);
  } finally {
    await owner.dispose();
  }
}

const schemaOperations = {
  'schema-duplicate-field': () => malformedInspection('test.duplicate-inspector', () => [{
    fields: [
      { id: 'same', label: 'A', readOnly: true, source: 'LOCKED', value: 1 },
      { id: 'same', label: 'B', readOnly: true, source: 'LOCKED', value: 2 },
    ],
    id: 'semantic',
    label: 'Semantic',
  }]),
  'schema-invalid-control-bound': () => malformedInspection('test.bound-inspector', () => [{
    fields: [{
      baselineValue: 1,
      control: { kind: 'number', max: Number.POSITIVE_INFINITY, min: 0 },
      id: 'price',
      label: 'Price',
      readOnly: false,
      source: 'AUTO',
      value: 1,
    }],
    id: 'semantic',
    label: 'Semantic',
  }]),
  'schema-missing-control': () => malformedInspection('test.control-inspector', () => [{
    fields: [{
      baselineValue: 1, id: 'price', label: 'Price', readOnly: false, source: 'AUTO', value: 1,
    }],
    id: 'semantic',
    label: 'Semantic',
  }]),
};

const negativeSource = await fixture();
let negativeArtifact = negativeSource.runtime.getSemanticArtifact('artifact.fvg-inspected');
const negativeOperations = {
  'after-observation-edit': () => revisionDraft(
    negativeSource.owner,
    negativeArtifact,
    { lowerPrice: 101.25, upperPrice: 102.75 },
    { replayCutoffEpochMs: OBSERVED_AT + MINUTE },
  ),
  'crossed-bounds': () => revisionDraft(
    negativeSource.owner, negativeArtifact, { lowerPrice: 102.75, upperPrice: 102.5 },
  ),
  'expanding-lower-bound': () => revisionDraft(
    negativeSource.owner, negativeArtifact, { lowerPrice: 100.75, upperPrice: 102.75 },
  ),
  'expanding-upper-bound': () => revisionDraft(
    negativeSource.owner, negativeArtifact, { lowerPrice: 101.25, upperPrice: 103.25 },
  ),
  'no-op-override': () => revisionDraft(
    negativeSource.owner, negativeArtifact, { lowerPrice: 101, upperPrice: 103 },
  ),
  'non-finite-bound': () => revisionDraft(
    negativeSource.owner, negativeArtifact, { lowerPrice: Number.NaN, upperPrice: 102.75 },
  ),
  'retrograde-edit-time': () => revisionDraft(
    negativeSource.owner,
    negativeArtifact,
    { lowerPrice: 101.25, upperPrice: 102.75 },
    { editedAtEpochMs: CREATED_AT - 1 },
  ),
  'unknown-revision-field': () => revisionDraft(
    negativeSource.owner,
    negativeArtifact,
    { future: 1, lowerPrice: 101.25, upperPrice: 102.75 },
  ),
  ...schemaOperations,
};

const staleDraft = revisionDraft(
  negativeSource.owner,
  negativeArtifact,
  { lowerPrice: 101.25, upperPrice: 102.75 },
);
const competingDraft = revisionDraft(
  negativeSource.owner,
  negativeArtifact,
  { lowerPrice: 101.5, upperPrice: 102.5 },
  { editedAtEpochMs: CREATED_AT + (2 * MINUTE) },
);
await negativeSource.runtime.reviseSemanticArtifact({
  draft: competingDraft,
  expectedArtifactRevision: 1,
  expectedDocumentRevision: 1,
  sessionId,
});
negativeOperations['stale-artifact'] = () => negativeSource.runtime.reviseSemanticArtifact({
  draft: staleDraft,
  expectedArtifactRevision: 1,
  expectedDocumentRevision: 2,
  sessionId,
});
const foreignOwner = registry();
await foreignOwner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
negativeOperations['foreign-revision-draft'] = () => foreignOwner.readArtifactRevisionDraft(staleDraft);
const generationSource = await fixture();
const generationDraft = revisionDraft(
  generationSource.owner,
  generationSource.runtime.getSemanticArtifact('artifact.fvg-inspected'),
  { lowerPrice: 101.25, upperPrice: 102.75 },
);
await generationSource.owner.disablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
await generationSource.owner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
negativeOperations['disabled-generation-draft'] = () => (
  generationSource.owner.readArtifactRevisionDraft(generationDraft)
);
const readOnlyController = await controllerFixture();
await readOnlyController.controller.select({
  artifactId: 'artifact.fvg-inspected', replayCutoffEpochMs: OBSERVED_AT + MINUTE,
});
negativeOperations['controller-read-only-edit'] = () => readOnlyController.controller.updateDraft({
  expectedDraftRevision: 1, field: 'lowerPrice', value: 101.25,
});
const staleController = await controllerFixture();
await staleController.controller.select({
  artifactId: 'artifact.fvg-inspected', replayCutoffEpochMs: OBSERVED_AT,
});
negativeOperations['controller-stale-draft'] = () => staleController.controller.updateDraft({
  expectedDraftRevision: 0, field: 'lowerPrice', value: 101.25,
});

assert.equal(negativeCases.schemaVersion, 1);
for (const testCase of negativeCases.cases) {
  const error = await capture(negativeOperations[testCase.name], testCase.name);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
  if (testCase.expectedCauseCode) {
    assert.equal(error.cause?.code, testCase.expectedCauseCode, `${testCase.name} cause`);
  }
}

const moduleSource = [
  'annotation-interaction', 'annotation-semantic-registry', 'semantic-fair-value-gap',
].flatMap((directory) => fs.readdirSync(path.join(V7_ROOT, 'src', directory))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src', directory, file), 'utf8')))
  .join('\n');
assert.doesNotMatch(
  moduleSource,
  /\b(?:localStorage|sessionStorage|requestRawBars|requestProjectedHistory|setData)\b/,
  'Semantic Inspector/package boundaries must not acquire storage, Bar Data, or Chart-series authority',
);
assert.doesNotMatch(
  fs.readFileSync(path.join(
    V7_ROOT,
    'src/annotation-interaction/semantic-inspector-controller.js',
  ), 'utf8'),
  /(?:imbalance\.fvg|lowerPrice|upperPrice)/,
  'generic Semantic Inspector controller must contain no FVG branch',
);

// The final section drives the focused real-Lightweight-Charts fixture.
const repositoryRoot = path.resolve(V7_ROOT, '..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-fvg-inspector-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/fvg-evidence-inspector-override/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1480,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) {
      return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

let cdp;
async function stopChrome() {
  if (chrome.exitCode !== null || chrome.signalCode !== null) return;
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
}

try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/fvg-evidence-inspector-override/`,
  });
  await waitFor(cdp, `['ready', 'failed'].includes(document.body.dataset.scenario)`, 15_000);
  const initial = await evaluate(cdp, `({
    candleBytes: globalThis.__fvgEvidenceInspectorFixture?.candleBytes(),
    initialCandleBytes: globalThis.__fvgEvidenceInspectorFixture?.initialCandleBytes,
    snapshot: globalThis.__fvgEvidenceInspectorFixture?.snapshot(),
    error: document.body.dataset.error ?? null,
    scenario: document.body.dataset.scenario,
  })`);
  assert.equal(initial.scenario, 'ready', initial.error ?? 'fixture did not become ready');
  assert.equal(initial.candleBytes, initial.initialCandleBytes);
  assert.equal(initial.snapshot.inspector.status, 'selected');
  assert.equal(initial.snapshot.inspector.groups.length, 3);
  assert.equal(initial.snapshot.accepted.projectionCount, 2);
  assert.equal(initial.snapshot.preview.projectionCount, 0);
  assert.equal(await evaluate(cdp, 'document.querySelectorAll("#groups input").length'), 2);

  const beforeInvalidDocument = JSON.stringify(initial.snapshot.document);
  await evaluate(cdp, `globalThis.__fvgEvidenceInspectorFixture
    .updateBounds(102.75, 102.5).catch(() => {})`);
  await waitFor(cdp, `document.querySelector('#inspector-state')?.dataset.error
    === 'ANNOTATION_SEMANTIC_INSPECTOR_OPERATION_FAILED'`, 10_000);
  const invalidState = await evaluate(cdp, `({
    document: globalThis.__fvgEvidenceInspectorFixture.snapshot().document,
    scenario: document.body.dataset.scenario,
    text: document.querySelector('#inspector-state').textContent,
  })`);
  assert.equal(invalidState.scenario, 'ready');
  assert.match(invalidState.text, /Rejected.*accepted Artifact unchanged/);
  assert.equal(JSON.stringify(invalidState.document), beforeInvalidDocument);
  assert.equal(await evaluate(cdp,
    'globalThis.__fvgEvidenceInspectorFixture.snapshot().accepted.projectionCount'), 0);
  assert.equal(await evaluate(cdp,
    'globalThis.__fvgEvidenceInspectorFixture.snapshot().preview.projectionCount'), 2);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.cancel()');
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.atObservation()');

  await evaluate(cdp, `globalThis.__fvgEvidenceInspectorFixture.updateBounds(101.25, 102.75)`);
  await waitFor(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot().inspector.dirty === true', 10_000);
  let browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.accepted.projectionCount, 0);
  assert.equal(browserState.preview.projectionCount, 2);
  assert.equal(browserState.document.revision, 1);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.cancel()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.accepted.projectionCount, 2);
  assert.equal(browserState.preview.projectionCount, 0);
  assert.equal(browserState.document.revision, 1);

  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.atObservation()');
  await evaluate(cdp, `globalThis.__fvgEvidenceInspectorFixture.updateBounds(101.25, 102.75)`);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.save()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.document.revision, 2);
  assert.equal(browserState.document.artifacts[0].attributes.lowerPrice.effectiveValue, 101.25);
  assert.equal(browserState.document.artifacts[0].attributes.upperPrice.effectiveValue, 102.75);
  assert.equal(browserState.preview.projectionCount, 0);
  assert.equal(browserState.accepted.projectionCount, 2);

  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.afterObservation()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.inspector.status, 'read-only');
  assert.equal(await evaluate(cdp, 'document.querySelectorAll("#groups input").length'), 0);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.beforeObservation()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.inspector.status, 'hidden');
  assert.equal(browserState.inspector.groups.length, 0);

  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.atObservation()');
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.resetDraft()');
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.save()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.document.revision, 3);
  assert.equal(browserState.document.artifacts[0].attributes.lowerPrice.effectiveSource, 'derived');
  assert.equal(browserState.document.artifacts[0].attributes.lowerPrice.overrideProvenance.events.length, 2);

  const canonicalDocument = JSON.stringify(browserState.document);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.disablePackage()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.package.state, 'disabled');
  assert.equal(browserState.accepted.projectionCount, 0);
  assert.equal(browserState.inspector.status, 'read-only');
  assert.equal(JSON.stringify(browserState.document), canonicalDocument);
  await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.enablePackage()');
  browserState = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.snapshot()');
  assert.equal(browserState.package.state, 'active');
  assert.equal(browserState.accepted.projectionCount, 2);
  assert.equal(browserState.candleBytes, initial.initialCandleBytes);

  const target = await evaluate(cdp, `(() => {
    const bounds = document.querySelector('#chart').getBoundingClientRect();
    return { x: bounds.left + (bounds.width / 2), y: bounds.top + (bounds.height / 2) };
  })()`);
  const rangeBeforeWheel = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.logicalRange()');
  await cdp.send('Input.dispatchMouseEvent', {
    deltaX: 0, deltaY: -220, type: 'mouseWheel', x: target.x, y: target.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rangeAfterWheel = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.logicalRange()');
  assert.notEqual(
    rangeAfterWheel.to - rangeAfterWheel.from,
    rangeBeforeWheel.to - rangeBeforeWheel.from,
    'native wheel zoom must remain active beside the Inspector',
  );
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved', x: target.x, y: target.y,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', x: target.x, y: target.y,
  });
  for (const delta of [24, 48, 72, 96, 120]) {
    await cdp.send('Input.dispatchMouseEvent', {
      button: 'left', buttons: 1, type: 'mouseMoved', x: target.x - delta, y: target.y,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased',
    x: target.x - 120, y: target.y,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const rangeAfterDrag = await evaluate(cdp, 'globalThis.__fvgEvidenceInspectorFixture.logicalRange()');
  assert.notEqual(rangeAfterDrag.from, rangeAfterWheel.from, 'native Chart drag must remain active');
  await evaluate(cdp, 'globalThis.__disposeFvgEvidenceInspectorFixture()');
} finally {
  if (cdp) cdp.close();
  await stopChrome();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 100,
  });
}

await Promise.all([
  primary.runtime.dispose(), primary.owner.dispose(),
  controlled.controller.dispose(), controlled.previewPort.dispose(), controlled.runtime.dispose(), controlled.owner.dispose(),
  rollbackController.controller.dispose(), rollbackController.previewPort.dispose(), rollbackController.runtime.dispose(), rollbackController.owner.dispose(),
  durableRollback.runtime.dispose(), durableRollback.owner.dispose(),
  durableRuntime.dispose(), durableOwner.dispose(), importedRuntime.dispose(), importOwner.dispose(),
  negativeSource.runtime.dispose(), negativeSource.owner.dispose(), foreignOwner.dispose(),
  generationSource.runtime.dispose(), generationSource.owner.dispose(),
  readOnlyController.controller.dispose(), readOnlyController.previewPort.dispose(), readOnlyController.runtime.dispose(), readOnlyController.owner.dispose(),
  staleController.controller.dispose(), staleController.previewPort.dispose(), staleController.runtime.dispose(), staleController.owner.dispose(),
]);

console.log(`v7 FVG Evidence Inspector And Override harness passed (${negativeCases.cases.length} negative controls)`);
