import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  createAnnotationProjection,
} from '../src/annotation-chart-projection/public.js';
import {
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  deriveAnnotationPaneProjectionSets,
} from '../src/annotation-context-projection/public.js';
import {
  createAnnotationRuntime,
  createDefaultDrawingPresentation,
  createDrawingId,
  createDrawingProvenance,
  createRestoredAnnotationRuntime,
} from '../src/annotation-runtime/public.js';
import {
  createSemanticPackageRegistry,
  defineSemanticPackage,
  defineSemanticType,
  readSemanticPackageManifest,
  readSemanticTypeDefinition,
} from '../src/annotation-semantic-registry/public.js';
import {
  createAnnotationStorageAdapter,
  createDurableAnnotationRepository,
} from '../src/annotation-persistence/public.js';
import { createLiquidityLevelSemanticPackage } from '../src/semantic-liquidity-level/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const PACKAGE_ID = 'first-party.liquidity-level';
const sessionId = createSessionId('session.r13-9');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-semantic-package/negative/cases.json',
), 'utf8'));

function anchor(offset, price = 100) {
  return Object.freeze({
    epochMs: BASE + (offset * MINUTE),
    instrumentId: 'instrument.nq',
    price,
  });
}

function context(observedOffset = 4) {
  return Object.freeze({
    createdAtEpochMs: BASE + (10 * MINUTE),
    instrumentId: 'instrument.nq',
    observedAtReplayCutoffEpochMs: BASE + (observedOffset * MINUTE),
    sourceTimeframeId: 'timeframe.1m',
  });
}

function packageManifest() {
  return createLiquidityLevelSemanticPackage({ geometryContract });
}

function registry(packages = [packageManifest()], capabilities = ['annotation.geometry.segment']) {
  return createSemanticPackageRegistry({ availableCapabilities: capabilities, packages });
}

function runtime(semanticContract, repository = createFakeAnnotationRepository()) {
  return createAnnotationRuntime({ geometryContract, repository, semanticContract, sessionId });
}

function manualDraft(owner, artifactId = 'artifact.manual-bsl', typeId = 'liquidity.bsl', overrides = {}) {
  return owner.constructArtifactDraft({
    artifactId,
    construction: {
      anchors: [anchor(1, 101), anchor(3, 101)],
      context: context(),
      mode: 'manual',
      presentation: null,
      ...overrides,
    },
    typeId,
    typeVersion: '1.0.0',
  });
}

function segment(start = anchor(1, 102), end = anchor(3, 102)) {
  return geometryContract.createSegmentGeometry({
    endAnchor: geometryContract.createMarketAnchor(end),
    startAnchor: geometryContract.createMarketAnchor(start),
  });
}

async function addDrawing(owner, drawingId = createDrawingId('drawing.level'), geometry = segment()) {
  await owner.createDrawing({
    drawingId,
    expectedDocumentRevision: owner.getDocument().revision,
    geometry,
    presentation: createDefaultDrawingPresentation(),
    provenance: createDrawingProvenance({
      createdAtEpochMs: BASE + (5 * MINUTE),
      observedAtReplayCutoffEpochMs: BASE + (4 * MINUTE),
      origin: 'manual',
    }),
    sessionId,
  });
  return drawingId;
}

function promotionDraft(owner, drawing, typeId = 'liquidity.bsl', artifactId = 'artifact.promoted') {
  return owner.constructArtifactDraft({
    artifactId,
    construction: { context: context(), drawing, mode: 'drawing-promotion' },
    typeId,
    typeVersion: '1.0.0',
  });
}

async function capture(action) {
  try { await action(); } catch (error) { return error; }
  assert.fail('Expected operation to fail.');
}

function genericType(typeId, {
  definitionId = `${typeId}.definition`, definitionVersion = '1.0.0',
  project = () => [], version = '1.0.0',
} = {}) {
  return defineSemanticType({
    construct: () => ({
      attributes: {}, presentation: null,
      provenance: {
        constructionSource: 'manual', createdAtEpochMs: BASE,
        instrumentId: 'instrument.nq', manualAnchors: [],
        observedAtReplayCutoffEpochMs: BASE, promotedFromDrawingId: null,
        packageProvenance: {}, recognitionSource: 'human', sourceBars: [],
        sourceTimeframeId: 'timeframe.1m',
      },
      relations: [], sourceDrawing: null,
    }),
    definitionId,
    definitionVersion,
    displayMetadata: { label: typeId },
    inspect: () => [],
    project,
    typeId,
    version,
  });
}

function genericPackage(packageId, type, overrides = {}) {
  return defineSemanticPackage({
    activate: overrides.activate ?? (async () => ({ dispose: async () => {} })),
    geometryDependencies: [],
    hostContractVersion: overrides.hostContractVersion ?? '1.0.0',
    packageId,
    packageVersion: overrides.packageVersion ?? '1.0.0',
    requiredCapabilities: overrides.requiredCapabilities ?? [],
    semanticTypes: [type],
    toolDescriptors: [],
  });
}

const empty = registry([]);
assert.deepEqual(empty.snapshot(), { activePackageCount: 0, packages: [], status: 'ready' });
assert.deepEqual(empty.listSemanticTypes(), []);
assert.deepEqual(empty.listTools(), []);

const primaryRegistry = registry();
await primaryRegistry.enablePackage(PACKAGE_ID);
assert.equal(primaryRegistry.snapshot().activePackageCount, 1);
assert.deepEqual(primaryRegistry.listSemanticTypes().map(({ typeId }) => typeId), [
  'liquidity.bsl', 'liquidity.ssl',
]);
assert.deepEqual(primaryRegistry.listTools().map(({ id }) => id), [
  'promote.liquidity.bsl', 'promote.liquidity.ssl',
]);

const primary = runtime(primaryRegistry);
const manual = manualDraft(primaryRegistry);
await primary.createSemanticArtifact({
  draft: manual,
  expectedDocumentRevision: 0,
  sessionId,
});
const manualArtifact = primary.getSemanticArtifact('artifact.manual-bsl');
assert.equal(manualArtifact.typeId, 'liquidity.bsl');
assert.equal(manualArtifact.attributes.levelPrice, 101);
assert.equal(manualArtifact.provenance.recognitionSource, 'human');
assert.equal(manualArtifact.provenance.constructionSource, 'manual');
assert.equal(primary.health().semanticPackageCount, 1);
assert.equal(primaryRegistry.inspectArtifact(manualArtifact).groups.length, 2);
assert.equal(primaryRegistry.projectionInputsForArtifact(manualArtifact).length, 1);
assert.deepEqual(primaryRegistry.inspectArtifactAtReplayCutoff(
  manualArtifact,
  BASE + (3 * MINUTE),
), {
  groups: [],
  resolution: null,
  visibility: { status: 'hidden-before-observation' },
});
assert.equal(primaryRegistry.inspectArtifactAtReplayCutoff(
  manualArtifact,
  BASE + (4 * MINUTE),
).visibility.status, 'visible');

const drawingId = await addDrawing(primary);
const drawing = primary.getDrawing(drawingId);
const promotedDraft = promotionDraft(primaryRegistry, drawing);
await primary.promoteDrawing({
  draft: promotedDraft,
  drawingDisposition: 'archive',
  drawingId,
  expectedDocumentRevision: 2,
  expectedDrawingRevision: 1,
  sessionId,
});
assert.equal(primary.getDrawing(drawingId).status, 'archived');
assert.equal(primary.getDrawing(drawingId).revision, 2);
assert.equal(primary.getSemanticArtifact('artifact.promoted').provenance.promotedFromDrawingId, 'drawing.level');
const promotedRevision = primary.getDocument().revision;
await primary.undo({ expectedDocumentRevision: promotedRevision, sessionId });
assert.equal(primary.getSemanticArtifact('artifact.promoted'), null);
assert.equal(primary.getDrawing(drawingId).status, 'active');
await primary.redo({ expectedDocumentRevision: promotedRevision + 1, sessionId });
assert.equal(primary.getSemanticArtifact('artifact.promoted').status, 'active');

const retainedRegistry = registry();
await retainedRegistry.enablePackage(PACKAGE_ID);
const retainedRuntime = runtime(retainedRegistry);
const retainedId = await addDrawing(retainedRuntime, createDrawingId('drawing.retained'));
await retainedRuntime.promoteDrawing({
  draft: promotionDraft(
    retainedRegistry,
    retainedRuntime.getDrawing(retainedId),
    'liquidity.ssl',
    'artifact.retained-ssl',
  ),
  drawingDisposition: 'retain',
  drawingId: retainedId,
  expectedDocumentRevision: 1,
  expectedDrawingRevision: 1,
  sessionId,
});
assert.equal(retainedRuntime.getDrawing(retainedId).status, 'active');
assert.equal(retainedRuntime.getDrawing(retainedId).revision, 1);
assert.equal(retainedRuntime.getSemanticArtifact('artifact.retained-ssl').typeId, 'liquidity.ssl');

const beforeDisableDocument = primary.getDocument();
const beforeDisableProjection = primaryRegistry.projectionInputsForArtifact(manualArtifact);
await primaryRegistry.disablePackage(PACKAGE_ID);
assert.equal(primaryRegistry.resolutionOf(manualArtifact).status, 'unresolved');
assert.equal(primaryRegistry.resolutionOf(manualArtifact).packageState, 'disabled');
assert.equal(primaryRegistry.projectionInputsForArtifact(manualArtifact).length, 0);
assert.equal(primaryRegistry.listTools().length, 0);
assert.equal(primaryRegistry.inspectArtifact(manualArtifact).groups.length, 2);
assert.deepEqual(primary.getDocument(), beforeDisableDocument);
await primaryRegistry.enablePackage(PACKAGE_ID);
assert.equal(primaryRegistry.resolutionOf(manualArtifact).status, 'resolved');
assert.deepEqual(primaryRegistry.projectionInputsForArtifact(manualArtifact), beforeDisableProjection);
assert.deepEqual(primary.getDocument(), beforeDisableDocument);

const policyRegistry = createInitialAnchorProjectionPolicyRegistry();
const subjects = primaryRegistry.projectionInputsForArtifact(manualArtifact)
  .map(createAnnotationProjectionSubject);
function projectionFrame(reconciliationRevision, replayCutoffEpochMs) {
  return createAnnotationProjectionFrame({
    annotationRevision: primary.getDocument().revision,
    panes: [{
      acceptedBuckets: Array.from({ length: 8 }, (_, index) => ({
        displayEpochMs: BASE + (index * MINUTE),
        endEpochMs: BASE + ((index + 1) * MINUTE),
        startEpochMs: BASE + (index * MINUTE),
      })),
      instrumentId: 'instrument.nq',
      paneId: 'pane.nq-1m',
      timeframeId: 'timeframe.1m',
    }],
    reconciliationRevision,
    replayCutoffEpochMs,
    sessionId,
  });
}
function derivedCount(reconciliationRevision, replayCutoffEpochMs) {
  return deriveAnnotationPaneProjectionSets({
    createProjection: createAnnotationProjection,
    frame: projectionFrame(reconciliationRevision, replayCutoffEpochMs),
    geometryContract,
    policyRegistry,
    subjects,
  })[0].projections.length;
}
assert.equal(derivedCount(1, BASE + (3 * MINUTE)), 0);
assert.equal(derivedCount(2, BASE + (4 * MINUTE)), 1);

const durableStorage = createMemoryWebStorage();
const durableRepository = createDurableAnnotationRepository({
  namespace: 'test.annotation.semantic',
  storage: createAnnotationStorageAdapter(durableStorage),
});
const durableRegistry = registry();
await durableRegistry.enablePackage(PACKAGE_ID);
const durable = await createRestoredAnnotationRuntime({
  geometryContract, repository: durableRepository, semanticContract: durableRegistry, sessionId,
});
await durable.createSemanticArtifact({
  draft: manualDraft(durableRegistry, 'artifact.durable'),
  expectedDocumentRevision: 0,
  sessionId,
});
const durableExport = JSON.parse(await durable.exportDocument());
durableExport.document.artifacts[0].futureArtifact = { retained: true };
durableExport.document.artifacts[0].provenance.futureProvenance = 'v-next';
const importStorage = createMemoryWebStorage();
const importRepository = createDurableAnnotationRepository({
  namespace: 'test.annotation.semantic-import',
  storage: createAnnotationStorageAdapter(importStorage),
});
const imported = await createRestoredAnnotationRuntime({
  geometryContract, repository: importRepository, sessionId,
});
await imported.importDocument({
  expectedDocumentRevision: 0,
  payload: JSON.stringify(durableExport),
  sessionId,
});
assert.equal(imported.listSemanticArtifacts().length, 1);
assert.equal(imported.health().semanticPackageCount, 0);
const unresolvedExport = JSON.parse(await imported.exportDocument());
assert.deepEqual(unresolvedExport.document.artifacts[0].futureArtifact, { retained: true });
assert.equal(unresolvedExport.document.artifacts[0].provenance.futureProvenance, 'v-next');
await imported.dispose();
const unresolvedReload = await createRestoredAnnotationRuntime({
  geometryContract, repository: importRepository, sessionId,
});
assert.equal(unresolvedReload.listSemanticArtifacts()[0].artifactId, 'artifact.durable');
assert.equal(unresolvedReload.health().semanticPackageCount, 0);

const goodType = genericType('test.good');
const failingType = genericType('test.failing', { project: () => { throw new Error('policy crash'); } });
const isolated = registry([
  genericPackage('test.good-package', goodType),
  genericPackage('test.failing-package', failingType),
]);
await isolated.enablePackage('test.good-package');
await isolated.enablePackage('test.failing-package');
const isolatedError = await capture(() => isolated.projectionInputsForArtifact({
  definition: {
    definitionId: 'test.failing.definition', definitionVersion: '1.0.0',
    packageId: 'test.failing-package', packageVersion: '1.0.0', status: 'recorded',
  },
  status: 'active', typeId: 'test.failing', typeVersion: '1.0.0',
}));
assert.equal(isolatedError.code, 'SEMANTIC_PACKAGE_POLICY_FAILED');
assert.equal(isolated.packageSnapshot('test.failing-package').state, 'failed');
assert.equal(isolated.packageSnapshot('test.good-package').state, 'active');

const disposedRegistry = registry();
await disposedRegistry.enablePackage(PACKAGE_ID);
await disposedRegistry.dispose();
assert.equal(disposedRegistry.snapshot().status, 'disposed');
assert.equal(disposedRegistry.packageSnapshot(PACKAGE_ID).state, 'disposed');

const operations = {
  'semantic-type-lookalike': () => readSemanticTypeDefinition({}),
  'package-manifest-lookalike': () => readSemanticPackageManifest({}),
  'duplicate-package-id': () => registry([packageManifest(), packageManifest()]),
  'unknown-package': () => registry([]).enablePackage('missing.package'),
  'incompatible-package': async () => {
    const owner = registry([genericPackage('test.incompatible', genericType('test.incompatible-type'), {
      hostContractVersion: '2.0.0',
    })]);
    await owner.enablePackage('test.incompatible');
  },
  'double-enable': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); await owner.enablePackage(PACKAGE_ID);
  },
  'type-collision': async () => {
    const owner = registry([
      genericPackage('test.collision-a', genericType('test.collision')),
      genericPackage('test.collision-b', genericType('test.collision')),
    ]);
    await owner.enablePackage('test.collision-a'); await owner.enablePackage('test.collision-b');
  },
  'unknown-type-construction': () => registry([]).constructArtifactDraft({
    artifactId: 'artifact.none', construction: {}, typeId: 'test.none', typeVersion: '1.0.0',
  }),
  'invalid-artifact-id': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID);
    owner.constructArtifactDraft({
      artifactId: ' invalid', construction: {}, typeId: 'liquidity.bsl', typeVersion: '1.0.0',
    });
  },
  'non-horizontal-liquidity': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID);
    manualDraft(owner, 'artifact.bad', 'liquidity.bsl', {
      anchors: [anchor(1, 100), anchor(2, 101)],
    });
  },
  'foreign-draft': async () => {
    const first = registry(); const second = registry();
    await first.enablePackage(PACKAGE_ID); await second.enablePackage(PACKAGE_ID);
    second.readArtifactDraft(manualDraft(first));
  },
  'stale-draft': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID);
    const draft = manualDraft(owner); await owner.disablePackage(PACKAGE_ID); owner.readArtifactDraft(draft);
  },
  'forged-runtime-draft': () => runtime(primaryRegistry).createSemanticArtifact({
    draft: {}, expectedDocumentRevision: 0, sessionId,
  }),
  'future-anchor': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); const target = runtime(owner);
    const draft = manualDraft(owner, 'artifact.future', 'liquidity.bsl', {
      anchors: [anchor(1, 100), anchor(5, 100)], context: context(4),
    });
    await target.createSemanticArtifact({ draft, expectedDocumentRevision: 0, sessionId });
  },
  'duplicate-artifact': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); const target = runtime(owner);
    await target.createSemanticArtifact({ draft: manualDraft(owner), expectedDocumentRevision: 0, sessionId });
    await target.createSemanticArtifact({ draft: manualDraft(owner), expectedDocumentRevision: 1, sessionId });
  },
  'drawing-draft-needs-promotion': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); const target = runtime(owner);
    const id = await addDrawing(target); const draft = promotionDraft(owner, target.getDrawing(id));
    await target.createSemanticArtifact({ draft, expectedDocumentRevision: 1, sessionId });
  },
  'invalid-promotion-disposition': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); const target = runtime(owner);
    const id = await addDrawing(target); const draft = promotionDraft(owner, target.getDrawing(id));
    await target.promoteDrawing({
      draft, drawingDisposition: 'implicit', drawingId: id,
      expectedDocumentRevision: 1, expectedDrawingRevision: 1, sessionId,
    });
  },
  'stale-promotion-source': async () => {
    const owner = registry(); await owner.enablePackage(PACKAGE_ID); const target = runtime(owner);
    const id = await addDrawing(target); const draft = promotionDraft(owner, target.getDrawing(id));
    await target.replaceDrawingGeometry({
      drawingId: id, expectedDocumentRevision: 1, expectedDrawingRevision: 1,
      geometry: segment(anchor(1, 103), anchor(3, 103)), sessionId,
    });
    await target.promoteDrawing({
      draft, drawingDisposition: 'retain', drawingId: id,
      expectedDocumentRevision: 2, expectedDrawingRevision: 2, sessionId,
    });
  },
  'missing-artifact': () => runtime(primaryRegistry).archiveSemanticArtifact({
    artifactId: 'artifact.missing', expectedArtifactRevision: 1,
    expectedDocumentRevision: 0, sessionId,
  }),
  'stale-artifact': () => primary.archiveSemanticArtifact({
    artifactId: 'artifact.manual-bsl', expectedArtifactRevision: 99,
    expectedDocumentRevision: primary.getDocument().revision, sessionId,
  }),
  'package-policy-failure': async () => {
    const owner = registry([genericPackage(
      'test.crash-package',
      genericType('test.crash', { project: () => { throw new Error('crash'); } }),
    )]);
    await owner.enablePackage('test.crash-package');
    owner.projectionInputsForArtifact({
      definition: {
        definitionId: 'test.crash.definition', definitionVersion: '1.0.0',
        packageId: 'test.crash-package', packageVersion: '1.0.0', status: 'recorded',
      },
      status: 'active', typeId: 'test.crash', typeVersion: '1.0.0',
    });
  },
  'disposed-registry': async () => {
    const owner = registry([]); await owner.dispose(); owner.listTools();
  },
};

assert.equal(negativeCases.schemaVersion, 1);
assert.equal(negativeCases.cases.length, 22);
for (const testCase of negativeCases.cases) {
  const error = await capture(operations[testCase.name]);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}

const repositoryRoot = path.resolve(V7_ROOT, '..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-semantic-package-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-semantic-package/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1440,820',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
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
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const killed = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGKILL');
    await Promise.race([killed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
}

try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-semantic-package/`,
  });
  await waitFor(cdp, `['ready', 'failed'].includes(document.body.dataset.scenario)`, 15_000);
  const initial = await evaluate(cdp, `({
    candleBytes: globalThis.__annotationSemanticPackageFixture?.candleBytes(),
    cyanPixels: globalThis.__annotationSemanticPackageFixture?.colorPixels([34, 211, 238]),
    error: document.body.dataset.error ?? null,
    initialCandleBytes: globalThis.__annotationSemanticPackageFixture?.initialCandleBytes,
    projectionCount: globalThis.__annotationSemanticPackageFixture?.projectionCount(),
    scenario: document.body.dataset.scenario,
  })`);
  assert.equal(initial.scenario, 'ready', initial.error ?? 'fixture did not become ready');
  assert.equal(initial.projectionCount, 1);
  assert.equal(initial.candleBytes, initial.initialCandleBytes);
  assert.ok(initial.cyanPixels > 10, 'generic Drawing must be visibly cyan');

  const promoted = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__annotationSemanticPackageFixture;
    await fixture.promoteBsl();
    const document = fixture.document();
    const artifact = document.artifacts[0];
    return {
      amberPixels: fixture.colorPixels([245, 158, 11]),
      artifactRevision: artifact.revision,
      artifactType: artifact.typeId,
      candleBytes: fixture.candleBytes(),
      documentRevision: document.revision,
      drawingStatus: document.drawings[0].status,
      groupIds: fixture.inspect().groups.map(({ id }) => id),
      projectionCount: fixture.projectionCount(),
      resolution: fixture.inspect().resolution.status,
    };
  })()`);
  assert.equal(promoted.artifactType, 'liquidity.bsl');
  assert.equal(promoted.artifactRevision, 1);
  assert.equal(promoted.documentRevision, 2);
  assert.equal(promoted.drawingStatus, 'archived');
  assert.deepEqual(promoted.groupIds, ['semantic', 'history']);
  assert.equal(promoted.projectionCount, 1);
  assert.equal(promoted.resolution, 'resolved');
  assert.equal(promoted.candleBytes, initial.initialCandleBytes);
  assert.ok(promoted.amberPixels > 10, 'promoted BSL must be visibly amber');

  const beforeObserved = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__annotationSemanticPackageFixture;
    const projectionCount = await fixture.before();
    return { inspect: fixture.inspect(), projectionCount };
  })()`);
  assert.equal(beforeObserved.projectionCount, 0);
  assert.deepEqual(beforeObserved.inspect, {
    groups: [], resolution: null, visibility: { status: 'hidden-before-observation' },
  });
  assert.equal(await evaluate(cdp, 'globalThis.__annotationSemanticPackageFixture.after()'), 1);
  const canonicalDocument = await evaluate(
    cdp,
    'JSON.stringify(globalThis.__annotationSemanticPackageFixture.document())',
  );
  const disabled = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__annotationSemanticPackageFixture;
    await fixture.disablePackage();
    return {
      amberPixels: fixture.colorPixels([245, 158, 11]),
      document: JSON.stringify(fixture.document()),
      packageState: fixture.packageSnapshot().state,
      projectionCount: fixture.projectionCount(),
      resolution: fixture.inspect().resolution.status,
    };
  })()`);
  assert.equal(disabled.packageState, 'disabled');
  assert.equal(disabled.projectionCount, 0);
  assert.equal(disabled.resolution, 'unresolved');
  assert.equal(disabled.document, canonicalDocument);
  assert.equal(disabled.amberPixels, 0);

  const enabled = await evaluate(cdp, `(async () => {
    const fixture = globalThis.__annotationSemanticPackageFixture;
    await fixture.enablePackage();
    return {
      amberPixels: fixture.colorPixels([245, 158, 11]),
      document: JSON.stringify(fixture.document()),
      packageState: fixture.packageSnapshot().state,
      projectionCount: fixture.projectionCount(),
      resolution: fixture.inspect().resolution.status,
    };
  })()`);
  assert.equal(enabled.packageState, 'active');
  assert.equal(enabled.projectionCount, 1);
  assert.equal(enabled.resolution, 'resolved');
  assert.equal(enabled.document, canonicalDocument);
  assert.ok(enabled.amberPixels > 10);
  await evaluate(cdp, 'globalThis.__disposeAnnotationSemanticPackageFixture()');
} finally {
  if (cdp) cdp.close();
  await stopChrome();
  await new Promise((resolve) => server.close(resolve));
  try {
    fs.rmSync(userDataDirectory, {
      force: true, maxRetries: 10, recursive: true, retryDelay: 100,
    });
  } catch (error) {
    if (error.code !== 'ENOTEMPTY') throw error;
  }
}

await Promise.all([
  durable.dispose(), durableRegistry.dispose(), empty.dispose(), isolated.dispose(),
  primary.dispose(), primaryRegistry.dispose(), retainedRuntime.dispose(), retainedRegistry.dispose(),
  unresolvedReload.dispose(),
]);

console.log(`v7 Annotation Semantic Package harness passed (${negativeCases.cases.length} negative controls)`);
