import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  AnnotationRuntimeError,
  createAnnotationRuntime,
  createDrawingId,
  createDrawingProvenance,
  readDrawingId,
  readDrawingProvenance,
} from '../src/annotation-runtime/public.js';
import * as sessionContract from '../src/session-identity/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-runtime/negative/cases.json',
), 'utf8'));
const { createSessionId, SessionIdentityError } = sessionContract;
const sessionA = createSessionId('session.annotation-A');
const sessionB = createSessionId('session.annotation-B');
const provenance = createDrawingProvenance({
  createdAtEpochMs: 9_000,
  observedAtReplayCutoffEpochMs: 5_000,
  origin: 'manual',
});

function geometry(epochMs = 1_000, price = 100) {
  return geometryContract.createPointGeometry({
    anchor: geometryContract.createMarketAnchor({
      epochMs, instrumentId: 'instrument.nq', price,
    }),
  });
}

function runtime(options = {}) {
  return createAnnotationRuntime({
    geometryContract,
    repository: options.repository ?? createFakeAnnotationRepository(),
    sessionId: options.sessionId ?? sessionA,
    ...options,
  });
}

function createInput(overrides = {}) {
  return {
    drawingId: createDrawingId('drawing.default'),
    expectedDocumentRevision: 0,
    geometry: geometry(),
    provenance,
    sessionId: sessionA,
    ...overrides,
  };
}

async function createdRuntime(options = {}) {
  const value = runtime(options);
  await value.createDrawing(createInput(options.createOverrides));
  return value;
}

const repository = createFakeAnnotationRepository();
const primary = runtime({ repository });
assert.deepEqual(primary.getDocument(), {
  artifacts: [], drawings: [], revision: 0, schemaVersion: 1, sessionId: 'session.annotation-A',
});
assert.deepEqual(primary.health(), {
  activeTransaction: false,
  documentRevision: 0,
  geometryAvailable: true,
  semanticPackageCount: 0,
  status: 'ready',
});

const drawingB = createDrawingId('drawing.B');
const drawingA = createDrawingId('drawing.A');
await primary.createDrawing(createInput({ drawingId: drawingB }));
const afterCreate = await primary.createDrawing(createInput({
  drawingId: drawingA,
  expectedDocumentRevision: 1,
  geometry: geometry(2_000, 105),
}));
assert.equal(afterCreate.revision, 2);
assert.deepEqual(afterCreate.drawings.map(({ drawingId }) => drawingId), ['drawing.A', 'drawing.B']);
assert.equal(afterCreate.drawings[0].revision, 1);
assert.equal(afterCreate.drawings[0].presentation, null);
assert.deepEqual(afterCreate.drawings[0].provenance, readDrawingProvenance(provenance));
assert.deepEqual(afterCreate.drawings[0].scope, {
  kind: 'session', sessionId: 'session.annotation-A',
});
assert.equal(Object.isFrozen(afterCreate), true);
assert.equal(Object.isFrozen(afterCreate.drawings), true);
assert.equal(Object.isFrozen(afterCreate.drawings[0]), true);
assert.equal(Object.isFrozen(afterCreate.drawings[0].geometry.payload), true);

const replaced = await primary.replaceDrawingGeometry({
  drawingId: drawingA,
  expectedDocumentRevision: 2,
  expectedDrawingRevision: 1,
  geometry: geometry(3_000, 110),
  sessionId: sessionA,
});
assert.equal(replaced.revision, 3);
assert.equal(primary.getDrawing(drawingA).revision, 2);
assert.equal(primary.getDrawing(drawingA).geometry.payload.anchor.price, 110);
assert.deepEqual(primary.getDrawing(drawingA).provenance, readDrawingProvenance(provenance));

const archived = await primary.archiveDrawing({
  drawingId: drawingA,
  expectedDocumentRevision: 3,
  expectedDrawingRevision: 2,
  sessionId: sessionA,
});
assert.equal(archived.revision, 4);
assert.equal(primary.getDrawing(drawingA).revision, 3);
assert.equal(primary.getDrawing(drawingA).status, 'archived');
const restored = await primary.restoreDrawing({
  drawingId: drawingA,
  expectedDocumentRevision: 4,
  expectedDrawingRevision: 3,
  sessionId: sessionA,
});
assert.equal(restored.revision, 5);
assert.equal(primary.getDrawing(drawingA).revision, 4);
assert.equal(primary.getDrawing(drawingA).status, 'active');
assert.equal(primary.listDrawings().length, 2);
assert.deepEqual(repository.inspect().finalized, restored);
assert.equal(repository.inspect().counts.finalize, 5);

const isolated = runtime({ sessionId: sessionB });
assert.equal(isolated.getDocument().revision, 0);
assert.equal(isolated.getDocument().sessionId, 'session.annotation-B');
assert.equal(isolated.listDrawings().length, 0);

assert.equal(readDrawingId(createDrawingId('drawing.roundtrip')), 'drawing.roundtrip');
assert.deepEqual(readDrawingProvenance(provenance), {
  createdAtEpochMs: 9_000,
  observedAtReplayCutoffEpochMs: 5_000,
  origin: 'manual',
});

async function failedRepository(failAt) {
  const faultRepository = createFakeAnnotationRepository({ failAt });
  const value = runtime({ repository: faultRepository });
  const before = value.getDocument();
  await assert.rejects(value.createDrawing(createInput()));
  assert.equal(value.getDocument(), before, `${failAt} must retain the exact accepted document`);
  return { faultRepository, value };
}

for (const stage of ['apply', 'finalize']) {
  const { faultRepository, value } = await failedRepository(stage);
  assert.equal(faultRepository.inspect().counts.rollback, 1);
  assert.equal(value.health().status, 'ready');
}
const poisoned = await failedRepository(['finalize', 'rollback']);
assert.equal(poisoned.value.health().status, 'poisoned');
assert.equal(poisoned.value.getDocument().revision, 0, 'poison keeps last accepted queries');

let releaseApply;
const applyGate = new Promise((resolve) => { releaseApply = resolve; });
const gated = runtime({ repository: createFakeAnnotationRepository({ applyGate }) });
const activeCreate = gated.createDrawing(createInput());
await Promise.resolve();
assert.equal(gated.health().activeTransaction, true);
await assert.rejects(gated.createDrawing(createInput({ drawingId: createDrawingId('drawing.concurrent') })),
  (error) => error.code === 'ANNOTATION_TRANSACTION_ACTIVE');
const disposing = gated.dispose();
assert.equal(gated.health().status, 'disposing');
releaseApply();
await activeCreate;
await disposing;
assert.equal(gated.health().status, 'disposed');

async function errorFor(operation) {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  assert.fail('negative operation unexpectedly succeeded');
}

async function operationRuntime(operation) {
  const value = await createdRuntime();
  return operation(value);
}

const operations = {
  'runtime-session-raw': () => createAnnotationRuntime({
    geometryContract, repository: createFakeAnnotationRepository(), sessionId: 'session.annotation-A',
  }),
  'runtime-repository': () => createAnnotationRuntime({ geometryContract, repository: {}, sessionId: sessionA }),
  'runtime-geometry-contract': () => createAnnotationRuntime({
    geometryContract: {}, repository: createFakeAnnotationRepository(), sessionId: sessionA,
  }),
  'drawing-id-token': () => createDrawingId(' drawing'),
  'drawing-id-lookalike': () => readDrawingId({ token: 'drawing' }),
  'provenance-fields': () => createDrawingProvenance({
    createdAtEpochMs: 1, observedAtReplayCutoffEpochMs: 1, origin: 'manual', editor: 'x',
  }),
  'provenance-origin': () => createDrawingProvenance({
    createdAtEpochMs: 1, observedAtReplayCutoffEpochMs: 1, origin: 'detector',
  }),
  'provenance-created': () => createDrawingProvenance({
    createdAtEpochMs: -1, observedAtReplayCutoffEpochMs: 1, origin: 'manual',
  }),
  'provenance-cutoff': () => createDrawingProvenance({
    createdAtEpochMs: 1, observedAtReplayCutoffEpochMs: 1.5, origin: 'manual',
  }),
  'provenance-lookalike': () => readDrawingProvenance(readDrawingProvenance(provenance)),
  'create-fields': () => runtime().createDrawing({ ...createInput(), extra: true }),
  'create-session-raw': () => runtime().createDrawing(createInput({ sessionId: 'session.annotation-A' })),
  'create-session-mismatch': () => runtime().createDrawing(createInput({ sessionId: sessionB })),
  'create-document-revision-invalid': () => runtime().createDrawing(createInput({ expectedDocumentRevision: -1 })),
  'create-document-stale': () => operationRuntime((value) => value.createDrawing(createInput({
    drawingId: createDrawingId('drawing.second'), expectedDocumentRevision: 0,
  }))),
  'create-drawing-id-raw': () => runtime().createDrawing(createInput({ drawingId: 'drawing.default' })),
  'create-geometry-lookalike': () => runtime().createDrawing(createInput({
    geometry: geometryContract.readDrawingGeometry(geometry()),
  })),
  'create-provenance-lookalike': () => runtime().createDrawing(createInput({
    provenance: readDrawingProvenance(provenance),
  })),
  'create-duplicate': () => operationRuntime((value) => value.createDrawing(createInput({
    expectedDocumentRevision: 1,
  }))),
  'replace-fields': () => operationRuntime((value) => value.replaceDrawingGeometry({
    drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
    expectedDrawingRevision: 1, geometry: geometry(), sessionId: sessionA, extra: true,
  })),
  'replace-missing': () => runtime().replaceDrawingGeometry({
    drawingId: createDrawingId('drawing.missing'), expectedDocumentRevision: 0,
    expectedDrawingRevision: 1, geometry: geometry(), sessionId: sessionA,
  }),
  'replace-revision-invalid': () => operationRuntime((value) => value.replaceDrawingGeometry({
    drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
    expectedDrawingRevision: 0, geometry: geometry(), sessionId: sessionA,
  })),
  'replace-drawing-stale': () => operationRuntime((value) => value.replaceDrawingGeometry({
    drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
    expectedDrawingRevision: 2, geometry: geometry(), sessionId: sessionA,
  })),
  'replace-document-stale': () => operationRuntime((value) => value.replaceDrawingGeometry({
    drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 0,
    expectedDrawingRevision: 1, geometry: geometry(), sessionId: sessionA,
  })),
  'replace-archived': async () => {
    const value = await createdRuntime();
    await value.archiveDrawing({
      drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
      expectedDrawingRevision: 1, sessionId: sessionA,
    });
    return value.replaceDrawingGeometry({
      drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 2,
      expectedDrawingRevision: 2, geometry: geometry(), sessionId: sessionA,
    });
  },
  'archive-missing': () => runtime().archiveDrawing({
    drawingId: createDrawingId('drawing.missing'), expectedDocumentRevision: 0,
    expectedDrawingRevision: 1, sessionId: sessionA,
  }),
  'archive-already': async () => {
    const value = await createdRuntime();
    await value.archiveDrawing({
      drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
      expectedDrawingRevision: 1, sessionId: sessionA,
    });
    return value.archiveDrawing({
      drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 2,
      expectedDrawingRevision: 2, sessionId: sessionA,
    });
  },
  'restore-active': () => operationRuntime((value) => value.restoreDrawing({
    drawingId: createDrawingId('drawing.default'), expectedDocumentRevision: 1,
    expectedDrawingRevision: 1, sessionId: sessionA,
  })),
  'repository-preparation-invalid': () => runtime({
    repository: { prepare: () => ({}) },
  }).createDrawing(createInput()),
  'repository-prepare-fail': () => runtime({
    repository: createFakeAnnotationRepository({ failAt: 'prepare' }),
  }).createDrawing(createInput()),
  'repository-apply-fail': () => runtime({
    repository: createFakeAnnotationRepository({ failAt: 'apply' }),
  }).createDrawing(createInput()),
  'repository-finalize-fail': () => runtime({
    repository: createFakeAnnotationRepository({ failAt: 'finalize' }),
  }).createDrawing(createInput()),
  'repository-rollback-fail': () => runtime({
    repository: createFakeAnnotationRepository({ failAt: ['finalize', 'rollback'] }),
  }).createDrawing(createInput()),
  'transaction-concurrent': async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const value = runtime({ repository: createFakeAnnotationRepository({ applyGate: gate }) });
    const first = value.createDrawing(createInput());
    await Promise.resolve();
    const second = value.createDrawing(createInput({ drawingId: createDrawingId('drawing.concurrent') }));
    release();
    await first;
    return second;
  },
  'geometry-unavailable': () => runtime({ geometryContract: null }).createDrawing(createInput()),
  'geometry-contract-violation': () => runtime({
    geometryContract: { readDrawingGeometry: () => ({
      payload: {}, schemaVersion: 1, typeId: 'geometry.test', typeVersion: '1.0.0',
    }) },
  }).createDrawing(createInput()),
  'runtime-disposed-command': async () => {
    const value = runtime();
    await value.dispose();
    return value.createDrawing(createInput());
  },
  'runtime-disposed-query': async () => {
    const value = runtime();
    await value.dispose();
    return value.getDocument();
  },
  'query-drawing-id-raw': () => runtime().getDrawing('drawing.default'),
};

for (const fixture of negativeCases) {
  const error = await errorFor(operations[fixture.operation]);
  assert.ok(
    error instanceof AnnotationRuntimeError || error instanceof SessionIdentityError,
    fixture.name,
  );
  assert.equal(error.code, fixture.expectedCode, fixture.name);
}

const descriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-runtime/module.json'),
  'utf8',
)));
assert.equal(descriptor.id, 'optional.annotation-runtime');
assert.equal(descriptor.removable, true);
assert.deepEqual(descriptor.optionalPorts, ['optional.annotation-geometry-domain']);
const annotationApi = await import('../src/annotation-runtime/public.js');
const sessionDescriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/session-identity/module.json'), 'utf8',
)));
const withGeometry = createModuleHost([
  { descriptor: sessionDescriptor, publicApi: sessionContract },
  {
    descriptor: normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
      path.join(V7_ROOT, 'src/annotation-geometry-domain/module.json'), 'utf8',
    ))),
    publicApi: geometryContract,
  },
  {
    descriptor,
    instantiate({ optionalPorts }) {
      assert.equal(optionalPorts['optional.annotation-geometry-domain'], geometryContract);
      return { dispose() {}, publicApi: annotationApi };
    },
  },
]);
await withGeometry.start();
await withGeometry.stop();
const withoutGeometry = createModuleHost([{
  descriptor: sessionDescriptor,
  publicApi: sessionContract,
}, {
  descriptor,
  instantiate({ optionalPorts, requiredPorts }) {
    assert.deepEqual(optionalPorts, {});
    assert.equal(requiredPorts['core.session-identity'], sessionContract);
    return { dispose() {}, publicApi: annotationApi };
  },
}]);
await withoutGeometry.start();
await withoutGeometry.stop();

const runtimeSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-runtime'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-runtime', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  'lightweight-charts', 'CanvasRenderingContext2D', '../bar-data-', '../replay-',
  '../workspace-transaction-', '../session-persistence/', '../v4', '../v5', '../v6',
  'imbalance.fvg', 'liquidity.bsl', 'liquidity.eql', 'structure.order-block',
]) {
  assert.equal(runtimeSource.includes(forbidden), false, `Annotation Runtime contains ${forbidden}`);
}

await primary.dispose();
await isolated.dispose();
await poisoned.value.dispose();
console.log(`v7 Annotation Runtime harness passed (${negativeCases.length} negative controls)`);
