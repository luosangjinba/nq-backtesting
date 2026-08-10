import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  createAnnotationStorageAdapter,
  createDurableAnnotationRepository,
} from '../src/annotation-persistence/public.js';
import {
  createAnnotationRuntime,
  createRestoredAnnotationRuntime,
} from '../src/annotation-runtime/public.js';
import {
  createSemanticPackageRegistry,
  defineSemanticPackage,
  defineSemanticType,
} from '../src/annotation-semantic-registry/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/semantic-contract-hardening/negative/cases.json',
), 'utf8'));
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const TYPE_ID = 'research.synthetic-setup';
const PACKAGE_ID = 'test.research-evidence';
const sessionId = createSessionId('session.r13-9b');

function memoryStorage() {
  const values = new Map();
  return Object.freeze({
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(String(key), String(value)),
  });
}

function repository(storage, namespace) {
  return createDurableAnnotationRepository({
    namespace,
    storage: createAnnotationStorageAdapter(storage),
  });
}

function universalProvenance(packageProvenance = richPackageProvenance()) {
  return {
    constructionSource: 'derived',
    createdAtEpochMs: BASE + 120_000,
    instrumentId: 'instrument.nq',
    manualAnchors: [],
    observedAtReplayCutoffEpochMs: BASE + 60_000,
    packageProvenance,
    promotedFromDrawingId: null,
    recognitionSource: 'detector',
    sourceBars: [{
      datasetRevision: 'dataset.synthetic-1',
      endEpochMs: BASE + 60_000,
      instrumentId: 'instrument.nq',
      sourceTimeframeId: 'timeframe.1m',
      startEpochMs: BASE,
    }],
    sourceTimeframeId: 'timeframe.1m',
  };
}

function richPackageProvenance() {
  return {
    attributeSources: {
      confidence: { effectiveSource: 'detector', overridden: false },
    },
    creatorNamespace: 'test.h108',
    definitionProfile: { profileId: 'profile.synthetic', version: '3.2.1' },
    detector: { detectorId: 'detector.synthetic', version: '2.1.0' },
  };
}

function syntheticPackage({
  activate = async () => ({ dispose: async () => {} }),
  definitionVersion = '1.0.0',
  packageVersion = '1.0.0',
  project = () => [],
  provenance = () => universalProvenance(),
} = {}) {
  const type = defineSemanticType({
    construct: () => ({
      attributes: { confidence: 0.91 },
      presentation: null,
      provenance: provenance(),
      relations: [],
      sourceDrawing: null,
    }),
    definitionId: 'research.synthetic-setup.definition',
    definitionVersion,
    displayMetadata: { label: 'Synthetic setup' },
    inspect: () => [],
    project,
    typeId: TYPE_ID,
    version: '1.0.0',
  });
  return defineSemanticPackage({
    activate,
    geometryDependencies: [],
    hostContractVersion: '1.0.0',
    packageId: PACKAGE_ID,
    packageVersion,
    requiredCapabilities: [],
    semanticTypes: [type],
    toolDescriptors: [],
  });
}

function registry(packageOptions = {}) {
  return createSemanticPackageRegistry({ packages: [syntheticPackage(packageOptions)] });
}

function draft(owner, artifactId = 'artifact.synthetic') {
  return owner.constructArtifactDraft({
    artifactId,
    construction: {},
    typeId: TYPE_ID,
    typeVersion: '1.0.0',
  });
}

async function capture(action) {
  try { await action(); } catch (error) { return error; }
  assert.fail('Expected operation to fail.');
}

async function createArtifact(owner, artifactId = 'artifact.synthetic') {
  const runtime = createAnnotationRuntime({
    geometryContract,
    repository: createFakeAnnotationRepository(),
    semanticContract: owner,
    sessionId,
  });
  await runtime.createSemanticArtifact({
    draft: draft(owner, artifactId),
    expectedDocumentRevision: 0,
    sessionId,
  });
  return { artifact: runtime.getSemanticArtifact(artifactId), runtime };
}

const durableStorage = memoryStorage();
const durableRepository = repository(durableStorage, 'test.h108.durable');
const producingRegistry = registry();
await producingRegistry.enablePackage(PACKAGE_ID);
const producingRuntime = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: durableRepository,
  semanticContract: producingRegistry,
  sessionId,
});
await producingRuntime.createSemanticArtifact({
  draft: draft(producingRegistry),
  expectedDocumentRevision: 0,
  sessionId,
});
const produced = producingRuntime.getSemanticArtifact('artifact.synthetic');
assert.deepEqual(produced.definition, {
  definitionId: 'research.synthetic-setup.definition',
  definitionVersion: '1.0.0',
  packageId: PACKAGE_ID,
  packageVersion: '1.0.0',
  status: 'recorded',
});
assert.deepEqual(produced.provenance.packageProvenance, richPackageProvenance());
assert.equal(Object.isFrozen(produced.provenance.packageProvenance.detector), true);
const durableExport = await producingRuntime.exportDocument();
await producingRuntime.dispose();
await producingRegistry.dispose();

const reloadRegistry = registry();
await reloadRegistry.enablePackage(PACKAGE_ID);
const reloaded = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: durableRepository,
  semanticContract: reloadRegistry,
  sessionId,
});
const reloadedArtifact = reloaded.getSemanticArtifact('artifact.synthetic');
assert.equal(reloadRegistry.resolutionOf(reloadedArtifact).status, 'resolved');
assert.deepEqual(reloadedArtifact.provenance.packageProvenance, richPackageProvenance());
await reloadRegistry.disablePackage(PACKAGE_ID);
assert.equal(reloadRegistry.resolutionOf(reloadedArtifact).status, 'unresolved');
assert.deepEqual(reloaded.getSemanticArtifact('artifact.synthetic'), reloadedArtifact);
await reloadRegistry.enablePackage(PACKAGE_ID);
assert.equal(reloadRegistry.resolutionOf(reloadedArtifact).status, 'resolved');

const importStorage = memoryStorage();
const enrichedExport = JSON.parse(durableExport);
enrichedExport.document.artifacts[0].definition.futureDefinitionField = { retained: true };
const imported = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: repository(importStorage, 'test.h108.imported'),
  sessionId,
});
await imported.importDocument({
  expectedDocumentRevision: 0,
  payload: JSON.stringify(enrichedExport),
  sessionId,
});
assert.deepEqual(
  imported.getSemanticArtifact('artifact.synthetic').provenance.packageProvenance,
  richPackageProvenance(),
);
assert.equal(JSON.parse(await imported.exportDocument()).document.schemaVersion, 2);
assert.deepEqual(
  JSON.parse(await imported.exportDocument()).document.artifacts[0].definition.futureDefinitionField,
  { retained: true },
);
await imported.dispose();
await reloaded.dispose();
await reloadRegistry.dispose();

for (const replacementOptions of [
  { packageVersion: '2.0.0' },
  { definitionVersion: '2.0.0' },
]) {
  const replacement = registry(replacementOptions);
  await replacement.enablePackage(PACKAGE_ID);
  assert.equal(replacement.resolutionOf(produced).status, 'unresolved');
  assert.equal(replacement.projectionInputsForArtifact(produced).length, 0);
  await replacement.dispose();
}

const legacyPayload = JSON.parse(durableExport);
legacyPayload.document.schemaVersion = 1;
delete legacyPayload.document.artifacts[0].definition;
delete legacyPayload.document.artifacts[0].provenance.packageProvenance;
const legacyRegistry = registry();
await legacyRegistry.enablePackage(PACKAGE_ID);
const legacyRuntime = await createRestoredAnnotationRuntime({
  geometryContract,
  repository: repository(memoryStorage(), 'test.h108.legacy'),
  semanticContract: legacyRegistry,
  sessionId,
});
await legacyRuntime.importDocument({
  expectedDocumentRevision: 0,
  payload: JSON.stringify(legacyPayload),
  sessionId,
});
const legacyArtifact = legacyRuntime.getSemanticArtifact('artifact.synthetic');
assert.deepEqual(legacyArtifact.definition, {
  definitionId: null,
  definitionVersion: null,
  packageId: null,
  packageVersion: null,
  status: 'legacy-unrecorded',
});
assert.deepEqual(legacyArtifact.provenance.packageProvenance, {});
assert.equal(legacyRegistry.resolutionOf(legacyArtifact).status, 'unresolved');
const migratedExport = JSON.parse(await legacyRuntime.exportDocument());
assert.equal(migratedExport.document.schemaVersion, 2);
assert.deepEqual(migratedExport.document.artifacts[0].provenance.packageProvenance, {});
await legacyRuntime.dispose();
await legacyRegistry.dispose();

const lifecycleOrder = [];
let activation = 0;
let releaseCleanup;
const cleanupGate = new Promise((resolve) => { releaseCleanup = resolve; });
const lifecycleRegistry = registry({
  activate: async () => {
    activation += 1;
    const generation = activation;
    lifecycleOrder.push(`activate-${generation}`);
    return {
      dispose: async () => {
        lifecycleOrder.push(`dispose-start-${generation}`);
        if (generation === 1) await cleanupGate;
        lifecycleOrder.push(`dispose-end-${generation}`);
      },
    };
  },
  project: () => { throw new Error('intentional policy crash'); },
});
await lifecycleRegistry.enablePackage(PACKAGE_ID);
const lifecycle = await createArtifact(lifecycleRegistry, 'artifact.lifecycle');
const policyError = await capture(() => lifecycleRegistry.projectionInputsForArtifact(lifecycle.artifact));
assert.equal(policyError.code, 'SEMANTIC_PACKAGE_POLICY_FAILED');
const reenable = lifecycleRegistry.enablePackage(PACKAGE_ID);
await Promise.resolve();
await Promise.resolve();
assert.deepEqual(lifecycleOrder, ['activate-1', 'dispose-start-1']);
releaseCleanup();
await reenable;
assert.deepEqual(lifecycleOrder, [
  'activate-1', 'dispose-start-1', 'dispose-end-1', 'activate-2',
]);
await lifecycle.runtime.dispose();
await lifecycleRegistry.dispose();

const operations = {
  'invalid-definition-identity': () => defineSemanticType({
    construct: () => ({}),
    definitionId: 'invalid',
    definitionVersion: '1.0.0',
    displayMetadata: {},
    inspect: () => [],
    project: () => [],
    typeId: TYPE_ID,
    version: '1.0.0',
  }),
  'missing-package-provenance': async () => {
    const owner = registry({
      provenance: () => {
        const value = universalProvenance();
        delete value.packageProvenance;
        return value;
      },
    });
    await owner.enablePackage(PACKAGE_ID);
    const target = createAnnotationRuntime({
      geometryContract,
      repository: createFakeAnnotationRepository(),
      semanticContract: owner,
      sessionId,
    });
    await target.createSemanticArtifact({ draft: draft(owner), expectedDocumentRevision: 0, sessionId });
  },
  'failed-generation-cleanup': async () => {
    const owner = registry({
      activate: async () => ({ dispose: async () => { throw new Error('cleanup crash'); } }),
      project: () => { throw new Error('policy crash'); },
    });
    await owner.enablePackage(PACKAGE_ID);
    const target = await createArtifact(owner, 'artifact.cleanup-failure');
    await capture(() => owner.projectionInputsForArtifact(target.artifact));
    await owner.enablePackage(PACKAGE_ID);
  },
};

assert.equal(negativeCases.schemaVersion, 1);
assert.equal(negativeCases.cases.length, 3);
for (const testCase of negativeCases.cases) {
  const error = await capture(operations[testCase.name]);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}

console.log('v7 Semantic Contract Hardening harness passed (3 negative controls)');
