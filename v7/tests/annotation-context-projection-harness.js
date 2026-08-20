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
  createChartAnnotationProjectionPort,
  readAnnotationProjection,
  readPreparedAnnotationProjection,
} from '../src/annotation-chart-projection/public.js';
import {
  ANCHOR_PROJECTION_POLICIES,
  AnnotationContextProjectionError,
  createAnchorProjectionPolicyRegistry,
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  createMultiPaneAnnotationProjectionRuntime,
  defineAnchorProjectionPolicy,
  deriveAnnotationPaneProjectionSets,
  readAnnotationProjectionFrame,
  readAnnotationProjectionSubject,
} from '../src/annotation-context-projection/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';
import * as sessionContract from '../src/session-identity/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const sessionId = sessionContract.createSessionId('session.r13-8');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-context-projection/negative/cases.json',
), 'utf8'));

function buckets(stepMinutes, count = 12) {
  const duration = stepMinutes * MINUTE;
  return Array.from({ length: count }, (_, index) => Object.freeze({
    displayEpochMs: BASE + ((index + 1) * duration) - MINUTE,
    endEpochMs: BASE + ((index + 1) * duration),
    startEpochMs: BASE + (index * duration),
  }));
}

function frame(reconciliationRevision, replayCutoffEpochMs, annotationRevision = 7) {
  return createAnnotationProjectionFrame({
    annotationRevision,
    panes: [
      {
        acceptedBuckets: buckets(1), instrumentId: 'instrument.nq',
        paneId: 'pane.nq-1m', timeframeId: 'timeframe.1m',
      },
      {
        acceptedBuckets: buckets(5, 3), instrumentId: 'instrument.nq',
        paneId: 'pane.nq-5m', timeframeId: 'timeframe.5m',
      },
      {
        acceptedBuckets: buckets(1), instrumentId: 'instrument.es',
        paneId: 'pane.es-1m', timeframeId: 'timeframe.1m',
      },
    ],
    reconciliationRevision,
    replayCutoffEpochMs,
    sessionId,
  });
}

function anchor(offsetMinutes, price, instrumentId = 'instrument.nq') {
  return geometryContract.createMarketAnchor({
    epochMs: BASE + (offsetMinutes * MINUTE), instrumentId, price,
  });
}

function presentation(strokeColor, fillColor = strokeColor) {
  return Object.freeze({
    fillColor, fillOpacity: 0.2, schemaVersion: 1, strokeColor, strokeWidth: 4,
  });
}

function sourceBar(offsetMinutes) {
  return Object.freeze({
    datasetRevision: 'dataset.fixture-1',
    endEpochMs: BASE + ((offsetMinutes + 1) * MINUTE),
    instrumentId: 'instrument.nq',
    sourceTimeframeId: 'timeframe.1m',
    startEpochMs: BASE + (offsetMinutes * MINUTE),
  });
}

function subject({
  entityId = 'drawing.segment-exact', geometry, observedAt = BASE + (2 * MINUTE),
  policyId = ANCHOR_PROJECTION_POLICIES.exactInstant,
  presentation: style = presentation('#22d3ee'), projectionId = 'projection.segment-exact',
  sourceBars = [],
} = {}) {
  return createAnnotationProjectionSubject({
    entityId,
    geometry: geometryContract.readDrawingGeometry(geometry),
    observedAtReplayCutoffEpochMs: observedAt,
    policy: { policyId, version: '1.0.0' },
    presentation: style,
    projectionId,
    revision: 3,
    sourceBars,
  });
}

const exactSegment = subject({
  geometry: geometryContract.createSegmentGeometry({
    endAnchor: anchor(4, 110), startAnchor: anchor(1, 101),
  }),
});
const containingRectangle = subject({
  entityId: 'drawing.rectangle-containing',
  geometry: geometryContract.createRectangleGeometry({
    firstAnchor: anchor(2, 99), secondAnchor: anchor(9, 112),
  }),
  policyId: ANCHOR_PROJECTION_POLICIES.acceptedContainingBucket,
  presentation: presentation('#f59e0b', '#f59e0b'),
  projectionId: 'projection.rectangle-containing',
  sourceBars: [sourceBar(2), sourceBar(9)],
});
const subjects = Object.freeze([exactSegment, containingRectangle]);
const policies = createInitialAnchorProjectionPolicyRegistry();
const canonicalBefore = JSON.stringify(subjects.map(readAnnotationProjectionSubject));

const beforeSets = deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: frame(1, BASE + MINUTE),
  geometryContract,
  policyRegistry: policies,
  subjects,
});
assert.deepEqual(beforeSets.map(({ projections }) => projections.length), [0, 0, 0]);

const afterFrame = frame(2, BASE + (10 * MINUTE));
const afterSets = deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: afterFrame,
  geometryContract,
  policyRegistry: policies,
  subjects,
});
assert.deepEqual(afterSets.map(({ projections }) => projections.length), [0, 2, 1],
  'sorted panes must receive instrument/timeframe-specific projections');
const oneMinuteSet = afterSets.find(({ paneId }) => paneId === 'pane.nq-1m');
const fiveMinuteSet = afterSets.find(({ paneId }) => paneId === 'pane.nq-5m');
assert.equal(oneMinuteSet.sessionId, sessionId, 'per-Pane derivation must retain exact Session identity');
assert.equal(fiveMinuteSet.provenance[0].mappings[0].canonicalEpochMs, BASE + (2 * MINUTE));
assert.equal(fiveMinuteSet.provenance[0].mappings[0].targetBucket.startEpochMs, BASE);
assert.equal(fiveMinuteSet.provenance[0].mappings[0].targetBucket.displayEpochMs,
  BASE + (4 * MINUTE));
assert.equal(fiveMinuteSet.provenance[0].mappings[0].sourceBar.datasetRevision, 'dataset.fixture-1');
assert.equal(oneMinuteSet.projections.map(readAnnotationProjection)
  .find(({ entityId }) => entityId === 'drawing.segment-exact').geometry.payload.startAnchor.epochMs,
BASE + MINUTE);
assert.equal(JSON.stringify(subjects.map(readAnnotationProjectionSubject)), canonicalBefore,
  'projection must not rewrite canonical Geometry or provenance');
const projectedFiveMinuteRectangle = fiveMinuteSet.projections.map(readAnnotationProjection)
  .find(({ entityId }) => entityId === 'drawing.rectangle-containing');
assert.equal(projectedFiveMinuteRectangle.geometry.payload.startEpochMs, BASE + (4 * MINUTE));
assert.equal(projectedFiveMinuteRectangle.geometry.payload.endEpochMs, BASE + (9 * MINUTE));

const fiveMinuteExactPoint = subject({
  entityId: 'drawing.point-exact-5m',
  geometry: geometryContract.createPointGeometry({ anchor: anchor(0, 105) }),
  observedAt: BASE,
  projectionId: 'projection.point-exact-5m',
});
const projectedFiveMinutePoint = deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: afterFrame,
  geometryContract,
  policyRegistry: policies,
  subjects: [fiveMinuteExactPoint],
}).find(({ paneId }) => paneId === 'pane.nq-5m').projections.map(readAnnotationProjection)[0];
assert.equal(projectedFiveMinutePoint.geometry.payload.anchor.epochMs, BASE + (4 * MINUTE),
  'exact canonical bucket starts must paint at the accepted Chart display time');

const pointSubject = subject({
  entityId: 'drawing.point-exact',
  geometry: geometryContract.createPointGeometry({ anchor: anchor(3, 105) }),
  observedAt: BASE,
  projectionId: 'projection.point-exact',
});
assert.equal(deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: afterFrame,
  geometryContract,
  policyRegistry: policies,
  subjects: [pointSubject],
}).find(({ paneId }) => paneId === 'pane.nq-1m').projections.length, 1,
'Point traversal must use the same registered Geometry projection operation');
const futureEndpointSegment = subject({
  entityId: 'drawing.segment-future-endpoint',
  geometry: geometryContract.createSegmentGeometry({
    endAnchor: anchor(4, 110), startAnchor: anchor(1, 101),
  }),
  observedAt: BASE,
  projectionId: 'projection.segment-future-endpoint',
});
assert.equal(deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: frame(4, BASE + (3 * MINUTE)),
  geometryContract,
  policyRegistry: policies,
  subjects: [futureEndpointSegment],
}).find(({ paneId }) => paneId === 'pane.nq-1m').projections.length, 0,
'a post-cutoff endpoint must hide the complete Geometry rather than clamp it');
const ambiguousRectangle = subject({
  entityId: 'drawing.rectangle-ambiguous',
  geometry: geometryContract.createRectangleGeometry({
    firstAnchor: anchor(2, 99), secondAnchor: anchor(9, 112),
  }),
  policyId: ANCHOR_PROJECTION_POLICIES.acceptedContainingBucket,
  projectionId: 'projection.rectangle-ambiguous',
  sourceBars: [sourceBar(2), sourceBar(2), sourceBar(9)],
});
assert.equal(deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: afterFrame,
  geometryContract,
  policyRegistry: policies,
  subjects: [ambiguousRectangle],
}).find(({ paneId }) => paneId === 'pane.nq-1m').projections.length, 0,
'ambiguous source evidence must make the complete Geometry absent');

const pluginPolicy = defineAnchorProjectionPolicy({
  policyId: 'projection.anchor.fixture-offset',
  version: '1.0.0',
  project({ anchor: candidate }) {
    return { anchor: candidate, mapping: { fixture: true } };
  },
});
const pluginRegistry = createAnchorProjectionPolicyRegistry({ definitions: [pluginPolicy] });
assert.equal(pluginRegistry.project(
  { policyId: 'projection.anchor.fixture-offset', version: '1.0.0' },
  { anchor: geometryContract.readMarketAnchor(anchor(1, 101)) },
).mapping.fixture, true, 'policy registry must remain plugin-composable');

const pluginGeometryDefinition = geometryContract.defineGeometryType({
  typeId: 'geometry.fixture-anchor',
  version: '1.0.0',
  normalize(value) { return { anchor: geometryContract.readMarketAnchor(value.anchor) }; },
  projectAnchors(value, projectAnchor) {
    const projected = projectAnchor(value.anchor);
    return projected === null ? null : { anchor: projected };
  },
});
const pluginGeometryRegistry = geometryContract.createGeometryRegistry({
  definitions: [pluginGeometryDefinition],
});
const pluginGeometry = pluginGeometryRegistry.create('geometry.fixture-anchor', { anchor: anchor(3, 105) });
const pluginGeometryContract = Object.freeze({
  projectDrawingGeometryAnchors: pluginGeometryRegistry.projectAnchors,
  readDrawingGeometry: geometryContract.readDrawingGeometry,
});
assert.equal(deriveAnnotationPaneProjectionSets({
  createProjection: createAnnotationProjection,
  frame: afterFrame,
  geometryContract: pluginGeometryContract,
  policyRegistry: policies,
  subjects: [subject({
    entityId: 'drawing.plugin-geometry',
    geometry: pluginGeometry,
    observedAt: BASE,
    projectionId: 'projection.plugin-geometry',
  })],
}).find(({ paneId }) => paneId === 'pane.nq-1m').projections.length, 1,
'a registered fourth Geometry must project without editing the coordinator');

function chartPort(adapter = createFakeAnnotationPrimitiveAdapter()) {
  return createChartAnnotationProjectionPort({ primitiveAdapter: adapter });
}

async function reconcile(runtime, targetFrame, surfaces, targetSubjects = subjects) {
  return runtime.reconcile({ frame: targetFrame, subjects: targetSubjects, surfaces });
}

const oneAdapter = createFakeAnnotationPrimitiveAdapter();
const fiveAdapter = createFakeAnnotationPrimitiveAdapter();
const onePort = chartPort(oneAdapter);
const fivePort = chartPort(fiveAdapter);
const runtime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection, geometryContract, policyRegistry: policies,
});
const surfaces = [
  { paneId: 'pane.nq-5m', port: fivePort },
  { paneId: 'pane.nq-1m', port: onePort },
];
await reconcile(runtime, frame(1, BASE + MINUTE), surfaces);
await reconcile(runtime, afterFrame, surfaces);
assert.equal(onePort.snapshot().projectionCount, 2);
assert.equal(fivePort.snapshot().projectionCount, 1);
await reconcile(runtime, frame(3, BASE + MINUTE), surfaces);
assert.equal(onePort.snapshot().projectionCount, 0);
assert.equal(fivePort.snapshot().projectionCount, 0);
assert.deepEqual(runtime.snapshot(), {
  acceptedAnnotationRevision: 7, acceptedReconciliationRevision: 3, active: false, status: 'ready',
});
await runtime.dispose();
await onePort.dispose();
await fivePort.dispose();

const reconciliationPort = chartPort();
let prepared = reconciliationPort.prepareReconciliation({
  annotationRevision: 7, projections: [], reconciliationRevision: 1,
});
let receipt = await reconciliationPort.apply(prepared);
await reconciliationPort.finalize(prepared, receipt);
prepared = reconciliationPort.prepareReconciliation({
  annotationRevision: 7,
  projections: oneMinuteSet.projections,
  reconciliationRevision: 2,
});
assert.deepEqual(readPreparedAnnotationProjection(prepared), {
  annotationRevision: 7,
  baseAnnotationRevision: 7,
  baseReconciliationRevision: 1,
  projectionCount: 2,
  reconciliationRevision: 2,
  schemaVersion: 2,
});
receipt = await reconciliationPort.apply(prepared);
await reconciliationPort.finalize(prepared, receipt);
await assert.rejects(Promise.resolve().then(() => reconciliationPort.prepareReconciliation({
  annotationRevision: 7, projections: [], reconciliationRevision: 2,
})), (error) => error.code === 'ANNOTATION_PROJECTION_RECONCILIATION_REVISION_STALE');
await reconciliationPort.dispose();

const rollbackOneAdapter = createFakeAnnotationPrimitiveAdapter();
const rollbackFiveAdapter = createFakeAnnotationPrimitiveAdapter({ failAt: 'attach:1:after' });
const rollbackOnePort = chartPort(rollbackOneAdapter);
const rollbackFivePort = chartPort(rollbackFiveAdapter);
const rollbackRuntime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection, geometryContract, policyRegistry: policies,
});
await assert.rejects(reconcile(rollbackRuntime, afterFrame, [
  { paneId: 'pane.nq-1m', port: rollbackOnePort },
  { paneId: 'pane.nq-5m', port: rollbackFivePort },
]), (error) => error.code === 'CONTEXT_PROJECTION_APPLY_FAILED');
assert.deepEqual(rollbackOneAdapter.inspect().active, []);
assert.deepEqual(rollbackFiveAdapter.inspect().active, []);
assert.equal(rollbackRuntime.snapshot().status, 'ready');
await rollbackRuntime.dispose();
await rollbackOnePort.dispose();
await rollbackFivePort.dispose();

const finalizeOnePort = chartPort(createFakeAnnotationPrimitiveAdapter());
const finalizeFivePort = chartPort(createFakeAnnotationPrimitiveAdapter({ failAt: 'destroy:1:after' }));
const finalizeRuntime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection, geometryContract, policyRegistry: policies,
});
const finalizeSurfaces = [
  { paneId: 'pane.nq-1m', port: finalizeOnePort },
  { paneId: 'pane.nq-5m', port: finalizeFivePort },
];
await reconcile(finalizeRuntime, frame(1, BASE + (10 * MINUTE)), finalizeSurfaces);
await assert.rejects(
  reconcile(finalizeRuntime, frame(2, BASE + MINUTE), finalizeSurfaces),
  (error) => error.code === 'CONTEXT_PROJECTION_FINALIZE_FAILED',
);
assert.deepEqual(finalizeRuntime.snapshot(), {
  acceptedAnnotationRevision: 7,
  acceptedReconciliationRevision: 2,
  active: false,
  status: 'poisoned',
}, 'post-decision cleanup failure must retain the accepted decision and poison reconstruction');
await finalizeRuntime.dispose();
await finalizeOnePort.dispose().catch(() => {});
await finalizeFivePort.dispose().catch(() => {});

const descriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-context-projection/module.json'), 'utf8',
)));
assert.equal(descriptor.id, 'optional.annotation-context-projection');
assert.equal(descriptor.owner, 'annotation-context-projection');
assert.deepEqual(descriptor.requiredPorts, ['core.session-identity']);
const publicApi = await import('../src/annotation-context-projection/public.js');
const sessionDescriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/session-identity/module.json'), 'utf8',
)));
const host = createModuleHost([{
  descriptor: sessionDescriptor,
  publicApi: sessionContract,
}, {
  descriptor,
  instantiate: () => ({ dispose() {}, publicApi }),
}]);
await host.start();
assert.equal(host.getPublicApi(descriptor.id), publicApi);
await host.stop();

function baseSubject(overrides = {}) {
  return {
    entityId: 'drawing.negative',
    geometry: geometryContract.readDrawingGeometry(geometryContract.createPointGeometry({ anchor: anchor(1, 100) })),
    observedAtReplayCutoffEpochMs: BASE,
    policy: { policyId: ANCHOR_PROJECTION_POLICIES.exactInstant, version: '1.0.0' },
    presentation: null,
    projectionId: 'projection.negative',
    revision: 1,
    sourceBars: [],
    ...overrides,
  };
}

function baseFrame(overrides = {}) {
  return {
    annotationRevision: 1,
    panes: [{
      acceptedBuckets: buckets(1, 2), instrumentId: 'instrument.nq',
      paneId: 'pane.negative', timeframeId: 'timeframe.1m',
    }],
    reconciliationRevision: 1,
    replayCutoffEpochMs: BASE + MINUTE,
    sessionId,
    ...overrides,
  };
}

function runtimeFixture() {
  return createMultiPaneAnnotationProjectionRuntime({
    createProjection: createAnnotationProjection, geometryContract, policyRegistry: policies,
  });
}

const invalidPolicy = defineAnchorProjectionPolicy({
  policyId: 'projection.anchor.fixture-invalid', version: '1.0.0', project: () => ({}),
});
const operations = {
  'frame-fields': () => createAnnotationProjectionFrame({ ...baseFrame(), extra: true }),
  'bucket-overlap': () => createAnnotationProjectionFrame(baseFrame({ panes: [{
    acceptedBuckets: [
      { displayEpochMs: BASE, startEpochMs: BASE, endEpochMs: BASE + (2 * MINUTE) },
      {
        displayEpochMs: BASE + MINUTE,
        startEpochMs: BASE + MINUTE,
        endEpochMs: BASE + (3 * MINUTE),
      },
    ],
    instrumentId: 'instrument.nq', paneId: 'pane.negative', timeframeId: 'timeframe.1m',
  }] })),
  'bucket-display-outside': () => createAnnotationProjectionFrame(baseFrame({ panes: [{
    acceptedBuckets: [{
      displayEpochMs: BASE - 1,
      endEpochMs: BASE + MINUTE,
      startEpochMs: BASE,
    }],
    instrumentId: 'instrument.nq', paneId: 'pane.negative', timeframeId: 'timeframe.1m',
  }] })),
  'subject-fields': () => createAnnotationProjectionSubject({ ...baseSubject(), extra: true }),
  'subject-portable': () => createAnnotationProjectionSubject(baseSubject({ geometry: { bad: () => {} } })),
  'source-bar': () => createAnnotationProjectionSubject(baseSubject({ sourceBars: [{
    ...sourceBar(1), endEpochMs: BASE + MINUTE,
  }] })),
  'policy-duplicate': () => createAnchorProjectionPolicyRegistry({ definitions: [pluginPolicy, pluginPolicy] }),
  'policy-unknown': () => policies.project({ policyId: 'projection.anchor.missing', version: '1.0.0' }, {}),
  'policy-version': () => policies.project({
    policyId: ANCHOR_PROJECTION_POLICIES.exactInstant, version: '2.0.0',
  }, {}),
  'policy-result': () => createAnchorProjectionPolicyRegistry({ definitions: [invalidPolicy] }).project(
    { policyId: 'projection.anchor.fixture-invalid', version: '1.0.0' }, {},
  ),
  'geometry-port': () => deriveAnnotationPaneProjectionSets({
    createProjection: createAnnotationProjection, frame: frame(1, BASE),
    geometryContract: {}, policyRegistry: policies, subjects: [],
  }),
  'projection-factory': () => deriveAnnotationPaneProjectionSets({
    createProjection: null, frame: frame(1, BASE),
    geometryContract, policyRegistry: policies, subjects: [],
  }),
  'subject-duplicate': () => deriveAnnotationPaneProjectionSets({
    createProjection: createAnnotationProjection, frame: frame(1, BASE + (10 * MINUTE)),
    geometryContract, policyRegistry: policies, subjects: [exactSegment, exactSegment],
  }),
  'reconcile-fields': () => runtimeFixture().reconcile({}),
  'surface-duplicate': () => {
    const value = runtimeFixture();
    const owner = chartPort();
    return value.reconcile({ frame: createAnnotationProjectionFrame(baseFrame()), subjects: [], surfaces: [
      { paneId: 'pane.negative', port: owner }, { paneId: 'pane.negative', port: owner },
    ] });
  },
  'reconciliation-stale': async () => {
    const value = runtimeFixture();
    const accepted = createAnnotationProjectionFrame(baseFrame());
    await value.reconcile({ frame: accepted, subjects: [], surfaces: [] });
    return value.reconcile({ frame: accepted, subjects: [], surfaces: [] });
  },
};

async function errorFor(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative operation unexpectedly succeeded');
}

for (const fixture of negativeCases) {
  const error = await errorFor(operations[fixture.operation]);
  assert.ok(error instanceof AnnotationContextProjectionError, fixture.name);
  assert.equal(error.code, fixture.expectedCode, fixture.name);
}

const source = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-context-projection'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-context-projection', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  '../bar-data-', '../replay-', '../workspace-', '../annotation-runtime/',
  'setData(', 'setVisibleLogicalRange', 'geometry.segment', 'geometry.rectangle',
  'imbalance.fvg', 'liquidity.bsl', 'liquidity.eql', 'structure.order-block',
  '../v4', '../v5', '../v6',
]) assert.equal(source.includes(forbidden), false, `context projection contains ${forbidden}`);

const repositoryRoot = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-context-projection-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-context-projection/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1280,760',
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
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-context-projection/`,
  });
  await waitFor(cdp, `['ready', 'failed'].includes(document.body.dataset.scenario)`, 15_000);
  const state = await evaluate(cdp, `({
    error: document.body.dataset.error ?? null,
    result: globalThis.__annotationContextProjectionResult ?? null,
    scenario: document.body.dataset.scenario,
  })`);
  assert.equal(state.scenario, 'ready', state.error ?? 'fixture did not become ready');
  assert.deepEqual(state.result.beforeCounts, [0, 0]);
  assert.deepEqual(state.result.afterCounts, [2, 1]);
  assert.deepEqual(state.result.returnCounts, [0, 0]);
  assert.equal(state.result.beforeData, state.result.afterData,
    'projection reconciliation must not rewrite candlestick data');
  assert.equal(state.result.beforeGeometry, state.result.afterGeometry,
    'projection reconciliation must not rewrite canonical Geometry');
  assert.ok(state.result.oneMinuteCyanPixels > 10);
  assert.ok(state.result.oneMinuteAmberPixels > 10);
  assert.ok(state.result.fiveMinuteAmberPixels > 10);
  assert.equal(state.result.fiveMinuteCyanPixels, 0);
  await evaluate(cdp, 'globalThis.__disposeAnnotationContextProjectionFixture()');
} finally {
  if (cdp) cdp.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => chrome.once('exit', resolve));
  await new Promise((resolve) => server.close(resolve));
  try {
    fs.rmSync(userDataDirectory, {
      force: true, maxRetries: 10, recursive: true, retryDelay: 100,
    });
  } catch (error) {
    if (error.code !== 'ENOTEMPTY') throw error;
  }
}

assert.equal(readAnnotationProjectionFrame(afterFrame).annotationRevision, 7);
console.log(`v7 Annotation Context Projection harness passed (${negativeCases.length} negative controls)`);
