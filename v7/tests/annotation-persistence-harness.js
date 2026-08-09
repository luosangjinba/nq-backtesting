import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  AnnotationPersistenceError,
  createAnnotationStorageAdapter,
  createDurableAnnotationRepository,
} from '../src/annotation-persistence/public.js';
import {
  AnnotationRuntimeError,
  createAnnotationRuntime,
  createDrawingId,
  createDrawingPresentation,
  createDrawingProvenance,
  createRestoredAnnotationRuntime,
} from '../src/annotation-runtime/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';
import * as sessionContract from '../src/session-identity/public.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-persistence/negative/cases.json',
), 'utf8'));
const { createSessionId, serializeSessionId } = sessionContract;
const sessionA = createSessionId('session.annotation-durable-A');
const sessionB = createSessionId('session.annotation-durable-B');
const provenance = createDrawingProvenance({
  createdAtEpochMs: 9_000,
  observedAtReplayCutoffEpochMs: 8_000,
  origin: 'manual',
});
const presentation = createDrawingPresentation({
  fillColor: '#123456',
  fillOpacity: 0.25,
  schemaVersion: 1,
  strokeColor: '#abcdef',
  strokeWidth: 3,
});

function createMemoryWebStorage() {
  const values = new Map();
  let failingWrites = 0;
  return {
    failNextWrite() { failingWrites += 1; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    raw(key) { return values.has(key) ? values.get(key) : null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) {
      if (failingWrites > 0) {
        failingWrites -= 1;
        throw new Error('intentional Annotation storage write failure');
      }
      values.set(String(key), String(value));
    },
  };
}

function point(epochMs = 1_000, price = 100) {
  return geometryContract.createPointGeometry({
    anchor: geometryContract.createMarketAnchor({
      epochMs,
      instrumentId: 'instrument.nq',
      price,
    }),
  });
}

function drawingInput(runtime, drawingId, overrides = {}) {
  return {
    drawingId,
    expectedDocumentRevision: runtime.getDocument().revision,
    geometry: point(),
    presentation,
    provenance,
    sessionId: sessionA,
    ...overrides,
  };
}

function repository(rawStorage, namespace) {
  return createDurableAnnotationRepository({
    namespace,
    storage: createAnnotationStorageAdapter(rawStorage),
  });
}

function storageKey(namespace, sessionId = sessionA) {
  return `${namespace}:session:${encodeURIComponent(serializeSessionId(sessionId).value)}`;
}

async function restoredRuntime(rawStorage, namespace, sessionId = sessionA) {
  return createRestoredAnnotationRuntime({
    geometryContract,
    repository: repository(rawStorage, namespace),
    sessionId,
  });
}

const reloadStorage = createMemoryWebStorage();
const reloadNamespace = 'test.annotation.reload';
const first = await restoredRuntime(reloadStorage, reloadNamespace);
assert.equal(first.getDocument().revision, 0);
assert.deepEqual(first.history(), {
  canRedo: false, canUndo: false, limit: 100, redoDepth: 0, undoDepth: 0,
});
const drawingA = createDrawingId('drawing.durable-A');
const created = await first.createDrawing(drawingInput(first, drawingA));
assert.equal(created.revision, 1);
assert.equal(first.history().undoDepth, 1);
const createdBytes = reloadStorage.raw(storageKey(reloadNamespace));
assert.equal(JSON.parse(createdBytes).version, 2);
await first.dispose();

const afterReload = await restoredRuntime(reloadStorage, reloadNamespace);
assert.deepEqual(afterReload.getDocument(), created);
assert.equal(afterReload.history().canUndo, true);
const undone = await afterReload.undo({ expectedDocumentRevision: 1, sessionId: sessionA });
assert.equal(undone.revision, 2);
assert.equal(undone.drawings.length, 0);
assert.deepEqual(afterReload.history(), {
  canRedo: true, canUndo: false, limit: 100, redoDepth: 1, undoDepth: 0,
});
await afterReload.dispose();

const afterUndoReload = await restoredRuntime(reloadStorage, reloadNamespace);
assert.equal(afterUndoReload.getDocument().revision, 2);
assert.equal(afterUndoReload.getDocument().drawings.length, 0);
const redone = await afterUndoReload.redo({ expectedDocumentRevision: 2, sessionId: sessionA });
assert.equal(redone.revision, 3);
assert.equal(redone.drawings.length, 1);
assert.equal(afterUndoReload.history().canRedo, false);
await afterUndoReload.undo({ expectedDocumentRevision: 3, sessionId: sessionA });
const divergentId = createDrawingId('drawing.divergent');
await afterUndoReload.createDrawing(drawingInput(afterUndoReload, divergentId, {
  geometry: point(3_000, 120),
}));
assert.equal(afterUndoReload.history().canRedo, false, 'divergent work must clear redo');
await afterUndoReload.dispose();

const boundedStorage = createMemoryWebStorage();
const bounded = await restoredRuntime(boundedStorage, 'test.annotation.bound');
const boundedId = createDrawingId('drawing.bound');
await bounded.createDrawing(drawingInput(bounded, boundedId));
for (let index = 0; index < 104; index += 1) {
  const drawing = bounded.getDrawing(boundedId);
  await bounded.replaceDrawingGeometry({
    drawingId: boundedId,
    expectedDocumentRevision: bounded.getDocument().revision,
    expectedDrawingRevision: drawing.revision,
    geometry: point(2_000 + index, 101 + index),
    sessionId: sessionA,
  });
}
assert.equal(bounded.history().undoDepth, 100);
await bounded.dispose();
const boundedReload = await restoredRuntime(boundedStorage, 'test.annotation.bound');
assert.equal(boundedReload.history().undoDepth, 100);
await boundedReload.dispose();

const sourceStorage = createMemoryWebStorage();
const sourceNamespace = 'test.annotation.opaque-source';
const source = await restoredRuntime(sourceStorage, sourceNamespace);
const opaqueId = createDrawingId('drawing.opaque');
await source.createDrawing(drawingInput(source, opaqueId));
const sourceExport = JSON.parse(await source.exportDocument());
sourceExport.document.futureDocument = { owner: 'future-client' };
const opaqueDrawing = sourceExport.document.drawings[0];
opaqueDrawing.futureDrawing = ['retained'];
opaqueDrawing.geometry.futureGeometry = { version: 7 };
opaqueDrawing.presentation.futurePresentation = true;
opaqueDrawing.provenance.futureProvenance = 'manual-v2';
opaqueDrawing.scope.futureScope = 42;
const opaquePayload = JSON.stringify(sourceExport);
await source.dispose();

const targetStorage = createMemoryWebStorage();
const targetNamespace = 'test.annotation.opaque-target';
const target = await restoredRuntime(targetStorage, targetNamespace);
await target.importDocument({
  expectedDocumentRevision: 0,
  payload: opaquePayload,
  sessionId: sessionA,
});
let exported = JSON.parse(await target.exportDocument());
assert.deepEqual(exported.document.futureDocument, { owner: 'future-client' });
assert.deepEqual(exported.document.drawings[0].futureDrawing, ['retained']);
assert.deepEqual(exported.document.drawings[0].geometry.futureGeometry, { version: 7 });
assert.equal(exported.document.drawings[0].presentation.futurePresentation, true);
assert.equal(exported.document.drawings[0].provenance.futureProvenance, 'manual-v2');
assert.equal(exported.document.drawings[0].scope.futureScope, 42);
const importedDrawing = target.getDrawing(opaqueId);
await target.reviseDrawing({
  drawingId: opaqueId,
  expectedDocumentRevision: 1,
  expectedDrawingRevision: importedDrawing.revision,
  geometry: point(5_000, 130),
  presentation: createDrawingPresentation({
    fillColor: '#654321', fillOpacity: 0.5, schemaVersion: 1,
    strokeColor: '#fedcba', strokeWidth: 4,
  }),
  sessionId: sessionA,
});
exported = JSON.parse(await target.exportDocument());
assert.equal(exported.document.drawings[0].futureDrawing[0], 'retained');
await target.undo({ expectedDocumentRevision: 2, sessionId: sessionA });
await target.undo({ expectedDocumentRevision: 3, sessionId: sessionA });
assert.equal(target.getDocument().drawings.length, 0);
assert.equal(Object.hasOwn(JSON.parse(await target.exportDocument()).document, 'futureDocument'), false);
await target.redo({ expectedDocumentRevision: 4, sessionId: sessionA });
assert.equal(JSON.parse(await target.exportDocument()).document.drawings[0].futureDrawing[0], 'retained');
await target.dispose();
const opaqueReload = await restoredRuntime(targetStorage, targetNamespace);
assert.equal(JSON.parse(await opaqueReload.exportDocument()).document.scope, undefined);
assert.equal(JSON.parse(await opaqueReload.exportDocument()).document.drawings[0].scope.futureScope, 42);
await opaqueReload.dispose();

const migrationStorage = createMemoryWebStorage();
const currentEntry = JSON.parse(sourceStorage.raw(storageKey(sourceNamespace)));
delete currentEntry.history;
currentEntry.version = 1;
const migrationNamespace = 'test.annotation.migration';
migrationStorage.setItem(storageKey(migrationNamespace), JSON.stringify(currentEntry));
const migrated = await restoredRuntime(migrationStorage, migrationNamespace);
assert.equal(migrated.getDocument().revision, 1);
assert.equal(migrated.history().undoDepth, 0);
await migrated.archiveDrawing({
  drawingId: opaqueId,
  expectedDocumentRevision: 1,
  expectedDrawingRevision: 1,
  sessionId: sessionA,
});
assert.equal(JSON.parse(migrationStorage.raw(storageKey(migrationNamespace))).version, 2);
await migrated.dispose();

const conflictStorage = createMemoryWebStorage();
const conflictNamespace = 'test.annotation.conflict';
const seedConflict = await restoredRuntime(conflictStorage, conflictNamespace);
const conflictId = createDrawingId('drawing.conflict');
await seedConflict.createDrawing(drawingInput(seedConflict, conflictId));
await seedConflict.dispose();
const conflictA = await restoredRuntime(conflictStorage, conflictNamespace);
const conflictB = await restoredRuntime(conflictStorage, conflictNamespace);
await conflictA.replaceDrawingGeometry({
  drawingId: conflictId, expectedDocumentRevision: 1, expectedDrawingRevision: 1,
  geometry: point(6_000, 140), sessionId: sessionA,
});
await assert.rejects(conflictB.replaceDrawingGeometry({
  drawingId: conflictId, expectedDocumentRevision: 1, expectedDrawingRevision: 1,
  geometry: point(7_000, 150), sessionId: sessionA,
}), (error) => error.code === 'ANNOTATION_REPOSITORY_PREPARE_FAILED');
assert.equal(conflictB.getDocument().revision, 1);
await conflictA.dispose();
await conflictB.dispose();

const rollbackStorage = createMemoryWebStorage();
const rollbackNamespace = 'test.annotation.rollback';
const rollbackRuntime = await restoredRuntime(rollbackStorage, rollbackNamespace);
const rollbackId = createDrawingId('drawing.rollback');
await rollbackRuntime.createDrawing(drawingInput(rollbackRuntime, rollbackId));
const priorBytes = rollbackStorage.raw(storageKey(rollbackNamespace));
const priorDocument = rollbackRuntime.getDocument();
rollbackStorage.failNextWrite();
await assert.rejects(rollbackRuntime.replaceDrawingGeometry({
  drawingId: rollbackId, expectedDocumentRevision: 1, expectedDrawingRevision: 1,
  geometry: point(8_000, 160), sessionId: sessionA,
}), (error) => error.code === 'ANNOTATION_TRANSACTION_FAILED');
assert.equal(rollbackStorage.raw(storageKey(rollbackNamespace)), priorBytes);
assert.equal(rollbackRuntime.getDocument(), priorDocument);
await rollbackRuntime.dispose();

const emptyRuntime = createAnnotationRuntime({
  geometryContract,
  repository: createFakeAnnotationRepository(),
  sessionId: sessionA,
});
const emptyDocument = emptyRuntime.getDocument();
const candidateRuntime = createAnnotationRuntime({
  geometryContract,
  repository: createFakeAnnotationRepository(),
  sessionId: sessionA,
});
await candidateRuntime.createDrawing(drawingInput(candidateRuntime, createDrawingId('drawing.candidate')));
const candidateDocument = candidateRuntime.getDocument();
const prepareInput = {
  baseDocument: emptyDocument,
  baseHistory: { redo: [], undo: [] },
  candidateDocument,
  candidateHistory: { redo: [], undo: [] },
  candidateOpaqueState: null,
  expectedRevision: 0,
  sessionId: sessionA,
};

const interleavedStorage = createMemoryWebStorage();
const interleavedRepository = repository(interleavedStorage, 'test.annotation.interleaved');
const interleavedCandidate = structuredClone(candidateDocument);
interleavedCandidate.drawings[0].drawingId = 'drawing.interleaved';
const firstPreparation = interleavedRepository.prepare(prepareInput);
const stalePreparation = interleavedRepository.prepare({
  ...prepareInput,
  candidateDocument: interleavedCandidate,
});
firstPreparation.apply();
firstPreparation.finalize();
const interleavedBytes = interleavedStorage.raw(storageKey('test.annotation.interleaved'));
assert.throws(
  () => stalePreparation.apply(),
  (error) => error.code === 'ANNOTATION_WRITE_CONFLICT',
  'apply must repeat CAS after an interleaved preparation',
);
assert.equal(
  interleavedStorage.raw(storageKey('test.annotation.interleaved')),
  interleavedBytes,
  'stale apply must not overwrite the accepted bytes',
);

function rawEntry(document = candidateDocument, sessionId = sessionA) {
  return {
    document,
    history: { redo: [], undo: [] },
    schema: 'v7.annotation-repository-entry',
    sessionId: serializeSessionId(sessionId),
    version: 2,
  };
}

function repositoryWithRaw(namespace, value, sessionId = sessionA) {
  const raw = createMemoryWebStorage();
  raw.setItem(storageKey(namespace, sessionId), typeof value === 'string' ? value : JSON.stringify(value));
  return repository(raw, namespace);
}

const invalidStoredDocument = structuredClone(candidateDocument);
invalidStoredDocument.drawings[0].geometry.typeVersion = '9.0.0';
const operations = {
  'storage-port': () => createAnnotationStorageAdapter(null),
  'repository-storage': () => createDurableAnnotationRepository({ storage: {} }),
  'repository-namespace': () => createDurableAnnotationRepository({
    namespace: '', storage: createAnnotationStorageAdapter(createMemoryWebStorage()),
  }),
  'load-json': () => repositoryWithRaw('negative.json', '{').load({ sessionId: sessionA }),
  'load-schema': () => repositoryWithRaw('negative.schema', {
    ...rawEntry(), schema: 'foreign.annotation-entry',
  }).load({ sessionId: sessionA }),
  'load-version': () => repositoryWithRaw('negative.version', {
    ...rawEntry(), version: 99,
  }).load({ sessionId: sessionA }),
  'load-session': () => repositoryWithRaw(
    'negative.session', rawEntry(candidateDocument, sessionA), sessionB,
  ).load({ sessionId: sessionB }),
  'load-history': () => repositoryWithRaw('negative.history', {
    ...rawEntry(), history: { redo: [], undo: Array.from({ length: 101 }, () => candidateDocument) },
  }).load({ sessionId: sessionA }),
  'prepare-fields': () => repository(createMemoryWebStorage(), 'negative.prepare-fields')
    .prepare({ ...prepareInput, extra: true }),
  'prepare-revision': () => repository(createMemoryWebStorage(), 'negative.prepare-revision')
    .prepare({ ...prepareInput, candidateDocument: { ...candidateDocument, revision: 2 } }),
  'import-json': () => repository(createMemoryWebStorage(), 'negative.import-json')
    .parseImport({ payload: '{', sessionId: sessionA }),
  'import-version': () => repository(createMemoryWebStorage(), 'negative.import-version')
    .parseImport({ payload: { ...JSON.parse(opaquePayload), version: 99 }, sessionId: sessionA }),
  'import-session': () => repository(createMemoryWebStorage(), 'negative.import-session')
    .parseImport({ payload: opaquePayload, sessionId: sessionB }),
  'undo-empty': () => emptyRuntime.undo({ expectedDocumentRevision: 0, sessionId: sessionA }),
  'redo-empty': () => emptyRuntime.redo({ expectedDocumentRevision: 0, sessionId: sessionA }),
  'restore-port': () => createRestoredAnnotationRuntime({
    geometryContract, repository: createFakeAnnotationRepository(), sessionId: sessionA,
  }),
  'export-port': () => emptyRuntime.exportDocument(),
  'restore-geometry': () => createAnnotationRuntime({
    geometryContract,
    initialState: {
      document: invalidStoredDocument,
      history: { redo: [], undo: [] },
      opaqueState: null,
    },
    repository: createFakeAnnotationRepository(),
    sessionId: sessionA,
  }),
};

async function captureError(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative Annotation persistence operation unexpectedly succeeded');
}

for (const fixture of negativeCases) {
  const error = await captureError(operations[fixture.operation]);
  assert.ok(
    error instanceof AnnotationPersistenceError || error instanceof AnnotationRuntimeError,
    fixture.name,
  );
  assert.equal(error.code, fixture.expectedCode, fixture.name);
}

const descriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-persistence/module.json'),
  'utf8',
)));
assert.equal(descriptor.id, 'adapter.annotation-persistence');
assert.equal(descriptor.removable, true);
const sessionDescriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/session-identity/module.json'), 'utf8',
)));
const withAdapter = createModuleHost([
  { descriptor: sessionDescriptor, publicApi: sessionContract },
  { descriptor, publicApi: await import('../src/annotation-persistence/public.js') },
]);
await withAdapter.start();
await withAdapter.stop();
const withoutAdapter = createModuleHost([{ descriptor: sessionDescriptor, publicApi: sessionContract }]);
await withoutAdapter.start();
assert.deepEqual(withoutAdapter.snapshot().moduleIds, ['core.session-identity']);
await withoutAdapter.stop();

const productionSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-persistence'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-persistence', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  'window.localStorage', 'lightweight-charts', 'CanvasRenderingContext2D',
  '../bar-data-', '../replay-', '../workspace-', '../server-state-', '../v4', '../v5', '../v6',
  'imbalance.fvg', 'liquidity.bsl', 'structure.order-block',
]) {
  assert.equal(productionSource.includes(forbidden), false, `Annotation persistence contains ${forbidden}`);
}

await emptyRuntime.dispose();
await candidateRuntime.dispose();
console.log(`v7 Annotation Persistence harness passed (${negativeCases.length} negative controls)`);
