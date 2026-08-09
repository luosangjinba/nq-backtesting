import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  AnnotationChartProjectionError,
  createAnnotationProjection,
  createChartAnnotationProjectionPort,
  createLightweightSeriesPrimitiveAdapter,
  createSegmentRenderPrimitive,
  readAnnotationProjection,
  readAnnotationProjectionReceipt,
  readPreparedAnnotationProjection,
} from '../src/annotation-chart-projection/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-chart-projection/negative/cases.json',
), 'utf8'));

function geometry(startEpochMs = 1_000, endEpochMs = 2_000, startPrice = 100, endPrice = 110) {
  return geometryContract.readDrawingGeometry(geometryContract.createSegmentGeometry({
    endAnchor: geometryContract.createMarketAnchor({
      epochMs: endEpochMs, instrumentId: 'instrument.nq', price: endPrice,
    }),
    startAnchor: geometryContract.createMarketAnchor({
      epochMs: startEpochMs, instrumentId: 'instrument.nq', price: startPrice,
    }),
  }));
}

function projection(revision = 1, overrides = {}) {
  return createAnnotationProjection({
    entityId: 'drawing.segment-A',
    geometry: geometry(),
    projectionId: 'projection.segment-A',
    revision,
    ...overrides,
  });
}

function port(adapter = createFakeAnnotationPrimitiveAdapter()) {
  return createChartAnnotationProjectionPort({ primitiveAdapter: adapter });
}

async function accept(owner, annotationRevision, projections) {
  const prepared = owner.prepare(annotationRevision, projections);
  const receipt = await owner.apply(prepared);
  await owner.finalize(prepared, receipt);
  return { prepared, receipt };
}

const initialAdapter = createFakeAnnotationPrimitiveAdapter();
const owner = port(initialAdapter);
const firstProjection = projection();
const firstPrepared = owner.prepare(7, [firstProjection]);
assert.deepEqual(readPreparedAnnotationProjection(firstPrepared), {
  annotationRevision: 7, baseAnnotationRevision: null, projectionCount: 1, schemaVersion: 1,
});
assert.deepEqual(initialAdapter.inspect().counts, {
  attach: 0, create: 0, destroy: 0, detach: 0, update: 0,
}, 'prepare must be inert');
const firstReceipt = await owner.apply(firstPrepared);
assert.deepEqual(readAnnotationProjectionReceipt(firstReceipt), {
  annotationRevision: 7, projectionCount: 1, schemaVersion: 1,
});
await owner.finalize(firstPrepared, firstReceipt);
assert.deepEqual(owner.snapshot(), {
  acceptedAnnotationRevision: 7,
  activePreparation: null,
  projectionCount: 1,
  projectionIds: ['projection.segment-A'],
  status: 'ready',
});
assert.deepEqual(initialAdapter.inspect().counts, {
  attach: 1, create: 1, destroy: 0, detach: 0, update: 0,
});

await accept(owner, 8, [firstProjection]);
assert.equal(initialAdapter.inspect().counts.update, 0, 'identical projection revision must retain handle');
const revisedProjection = projection(2, { geometry: geometry(2_000, 4_000, 105, 115) });
const updatePrepared = owner.prepare(9, [revisedProjection]);
const updateReceipt = await owner.apply(updatePrepared);
assert.equal(initialAdapter.inspect().handles.length, 1, 'projection update must retain one primitive handle');
assert.equal(initialAdapter.inspect().handles[0].projection.revision, 2);
await owner.rollback(updatePrepared, updateReceipt);
assert.equal(initialAdapter.inspect().handles[0].projection.revision, 1,
  'rollback must restore the exact previous projection');
await accept(owner, 9, [revisedProjection]);
const detachPrepared = owner.prepare(10, []);
const detachReceipt = await owner.apply(detachPrepared);
assert.deepEqual(initialAdapter.inspect().active, []);
await owner.rollback(detachPrepared, detachReceipt);
assert.deepEqual(initialAdapter.inspect().active, [1], 'detach rollback must reattach the prior handle');
await accept(owner, 10, []);
assert.deepEqual(initialAdapter.inspect().destroyed, [1]);
assert.equal(owner.snapshot().projectionCount, 0);
await owner.dispose();
assert.equal(owner.snapshot().status, 'disposed');
await owner.dispose();

let releaseAttach;
const attachGate = new Promise((resolve) => { releaseAttach = resolve; });
const gatedBase = createFakeAnnotationPrimitiveAdapter();
const gatedOwner = port(Object.freeze({
  ...gatedBase,
  async attach(handle) {
    gatedBase.attach(handle);
    await attachGate;
  },
}));
const gatedPrepared = gatedOwner.prepare(1, [projection()]);
const gatedApply = gatedOwner.apply(gatedPrepared);
await Promise.resolve();
await assert.rejects(gatedOwner.apply(gatedPrepared), (error) => (
  error.code === 'ANNOTATION_PROJECTION_PORT_BUSY'
));
await assert.rejects(gatedOwner.rollback(gatedPrepared), (error) => (
  error.code === 'ANNOTATION_PROJECTION_PORT_BUSY'
));
await assert.rejects(gatedOwner.dispose(), (error) => (
  error.code === 'ANNOTATION_PROJECTION_PORT_BUSY'
));
releaseAttach();
const gatedReceipt = await gatedApply;
await gatedOwner.finalize(gatedPrepared, gatedReceipt);
await gatedOwner.dispose();

for (const failAt of ['attach:1:after', 'update:1:after', 'detach:1:after']) {
  const adapter = createFakeAnnotationPrimitiveAdapter({ failAt });
  const value = port(adapter);
  if (failAt.startsWith('update') || failAt.startsWith('detach')) await accept(value, 1, [projection()]);
  const target = failAt.startsWith('attach') ? [projection()]
    : (failAt.startsWith('update') ? [projection(2)] : []);
  await assert.rejects(value.apply(value.prepare(2, target)), (error) => (
    error.code === 'ANNOTATION_PROJECTION_APPLY_FAILED'
  ), `${failAt} must restore prior visible state`);
  assert.equal(value.snapshot().status, 'ready');
  assert.equal(value.snapshot().acceptedAnnotationRevision, failAt.startsWith('attach') ? null : 1);
  await value.dispose();
}

const poisonAdapter = createFakeAnnotationPrimitiveAdapter({
  failAt: ['update:1:after', 'update:2:before'],
});
const poisoned = port(poisonAdapter);
await accept(poisoned, 1, [projection()]);
await assert.rejects(poisoned.apply(poisoned.prepare(2, [projection(2)])), (error) => (
  error.code === 'ANNOTATION_PROJECTION_ROLLBACK_FAILED'
));
assert.equal(poisoned.snapshot().status, 'poisoned');
await poisoned.dispose().catch(() => {});

const finalizeAdapter = createFakeAnnotationPrimitiveAdapter({ failAt: 'destroy:1:after' });
const finalizePoisoned = port(finalizeAdapter);
await accept(finalizePoisoned, 1, [projection()]);
const removePrepared = finalizePoisoned.prepare(2, []);
const removeReceipt = await finalizePoisoned.apply(removePrepared);
await assert.rejects(finalizePoisoned.finalize(removePrepared, removeReceipt), (error) => (
  error.code === 'ANNOTATION_PROJECTION_FINALIZE_FAILED'
));
assert.equal(finalizePoisoned.snapshot().acceptedAnnotationRevision, 2);
assert.equal(finalizePoisoned.snapshot().status, 'poisoned');
await finalizePoisoned.dispose().catch(() => {});

function rawGeometry(overrides = {}) {
  return { payload: {}, schemaVersion: 1, typeId: 'geometry.test', typeVersion: '1.0.0', ...overrides };
}

async function configuredOwner() {
  const value = port();
  await accept(value, 1, [projection()]);
  return value;
}

const operations = {
  'projection-fields': () => createAnnotationProjection({
    entityId: 'drawing.A', geometry: geometry(), projectionId: 'projection.A', revision: 1, extra: true,
  }),
  'projection-id': () => projection(1, { projectionId: ' bad' }),
  'entity-id': () => projection(1, { entityId: '' }),
  'projection-revision': () => projection(0),
  'geometry-fields': () => projection(1, { geometry: { ...rawGeometry(), extra: true } }),
  'geometry-schema': () => projection(1, { geometry: rawGeometry({ schemaVersion: 2 }) }),
  'geometry-type': () => projection(1, { geometry: rawGeometry({ typeId: 'segment' }) }),
  'geometry-version': () => projection(1, { geometry: rawGeometry({ typeVersion: 'one' }) }),
  'geometry-nonportable': () => projection(1, { geometry: rawGeometry({ payload: { bad: () => {} } }) }),
  'geometry-cycle': () => {
    const payload = {};
    payload.self = payload;
    return projection(1, { geometry: rawGeometry({ payload }) });
  },
  'projection-lookalike': () => readAnnotationProjection(readAnnotationProjection(projection())),
  'primitive-adapter': () => createChartAnnotationProjectionPort({ primitiveAdapter: {} }),
  'annotation-revision': () => port().prepare(-1, []),
  'projection-list': () => port().prepare(1, null),
  'projection-duplicate': () => port().prepare(1, [projection(), projection()]),
  'preparation-active': () => {
    const value = port();
    value.prepare(1, []);
    return value.prepare(2, []);
  },
  'annotation-stale': async () => (await configuredOwner()).prepare(1, [projection()]),
  'projection-stale': async () => {
    const value = port();
    await accept(value, 1, [projection(2)]);
    return value.prepare(2, [projection(1)]);
  },
  'projection-collision': async () => (await configuredOwner()).prepare(2, [
    projection(1, { geometry: geometry(2_000, 3_000, 101, 111) }),
  ]),
  'prepared-lookalike': () => port().apply({}),
  'receipt-unexpected': () => {
    const value = port();
    const prepared = value.prepare(1, []);
    return value.rollback(prepared, {});
  },
  'receipt-raw': async () => {
    const value = port();
    const prepared = value.prepare(1, []);
    await value.apply(prepared);
    return value.rollback(prepared, {});
  },
  'receipt-foreign': async () => {
    const left = port(), right = port();
    const leftPrepared = left.prepare(1, []), rightPrepared = right.prepare(1, []);
    await left.apply(leftPrepared);
    const rightReceipt = await right.apply(rightPrepared);
    return left.rollback(leftPrepared, rightReceipt);
  },
  'finalize-twice': async () => {
    const value = port();
    const prepared = value.prepare(1, []);
    const receipt = await value.apply(prepared);
    await value.finalize(prepared, receipt);
    return value.finalize(prepared, receipt);
  },
  'port-disposed': async () => {
    const value = port();
    await value.dispose();
    return value.prepare(1, []);
  },
  'series-port': () => createLightweightSeriesPrimitiveAdapter({ createPrimitive() {}, series: {} }),
  'primitive-factory': () => createLightweightSeriesPrimitiveAdapter({
    createPrimitive: null, series: { attachPrimitive() {}, detachPrimitive() {} },
  }),
  'segment-geometry': () => createSegmentRenderPrimitive(createAnnotationProjection({
    entityId: 'drawing.point',
    geometry: geometryContract.readDrawingGeometry(geometryContract.createPointGeometry({
      anchor: geometryContract.createMarketAnchor({
        epochMs: 1_000, instrumentId: 'instrument.nq', price: 100,
      }),
    })),
    projectionId: 'projection.point',
    revision: 1,
  })),
  'segment-options': () => createSegmentRenderPrimitive(projection(), { lineWidth: 0 }),
  'segment-attach': () => createSegmentRenderPrimitive(projection()).primitive.attached({}),
};

async function errorFor(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative operation unexpectedly succeeded');
}

for (const fixture of negativeCases) {
  const error = await errorFor(operations[fixture.operation]);
  assert.ok(error instanceof AnnotationChartProjectionError, fixture.name);
  assert.equal(error.code, fixture.expectedCode, fixture.name);
}

const descriptor = normalizeModuleDescriptor(JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'src/annotation-chart-projection/module.json'),
  'utf8',
)));
assert.equal(descriptor.id, 'optional.annotation-chart-projection');
assert.equal(descriptor.owner, 'chart-runtime-adapter');
assert.deepEqual(descriptor.requiredPorts, []);
assert.deepEqual(descriptor.optionalPorts, []);
const publicApi = await import('../src/annotation-chart-projection/public.js');
const host = createModuleHost([{
  descriptor,
  instantiate: () => ({ dispose() {}, publicApi }),
}]);
await host.start();
assert.equal(host.getPublicApi(descriptor.id), publicApi);
await host.stop();

const r13_5Files = new Set([
  'chart-annotation-preview.js',
  'lightweight-annotation-interaction-port.js',
  'preview-identity.js',
]);
const source = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-chart-projection'))
  .filter((file) => file.endsWith('.js') && !r13_5Files.has(file))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-chart-projection', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  '../annotation-runtime/', '../bar-data-', '../replay-', '../workspace-', 'setData(',
  'setVisibleLogicalRange', 'pointerdown', 'pointermove', 'pointerup', 'previewIdentity',
  'imbalance.fvg', 'liquidity.bsl', 'liquidity.eql', 'structure.order-block', '../v4', '../v5', '../v6',
]) assert.equal(source.includes(forbidden), false, `projection module contains ${forbidden}`);

const repositoryRoot = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-annotation-projection-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-chart-projection/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1000,620',
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
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-chart-projection/`,
  });
  try {
    await waitFor(
      cdp,
      `['ready', 'failed'].includes(document.querySelector('#chart')?.dataset.scenario)`,
      15_000,
    );
  } catch (cause) {
    const diagnostic = await evaluate(cdp, `({
      chart: document.querySelector('#chart')?.dataset ?? null,
      resources: performance.getEntriesByType('resource').map(({ name }) => name),
      title: document.title,
      url: location.href,
    })`);
    throw new Error(`Annotation projection fixture stalled: ${JSON.stringify(diagnostic)}`, { cause });
  }
  const fixtureState = await evaluate(cdp, `({
    error: document.querySelector('#chart')?.dataset.error ?? null,
    scenario: document.querySelector('#chart')?.dataset.scenario ?? null,
  })`);
  assert.equal(fixtureState.scenario, 'ready', fixtureState.error ?? 'fixture did not become ready');
  const browserResult = await evaluate(cdp, 'globalThis.__annotationProjectionResult');
  assert.equal(browserResult.acceptedAnnotationRevision, 9);
  assert.equal(browserResult.beforeData, browserResult.afterData,
    'Annotation primitive lifecycle must not rewrite candlestick data');
  assert.ok(browserResult.paintedPixels > 10, 'static Segment must paint visible magenta pixels');
  assert.ok(browserResult.updatedPixels > 10, 'updated Segment must remain visibly painted');
  assert.equal(browserResult.detachedPixels, 0, 'detached Segment pixels must leave the chart');
  assert.equal(browserResult.handleCount, 1, 'Segment update must reuse one RenderPrimitive handle');
  assert.equal(browserResult.destroyed, true);
  assert.equal(browserResult.projectionCount, 0);
  await evaluate(cdp, 'globalThis.__disposeAnnotationProjectionFixture()');
} finally {
  if (cdp) cdp.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => chrome.once('exit', resolve));
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(userDataDirectory, {
    force: true, maxRetries: 5, recursive: true, retryDelay: 100,
  });
}

console.log(`v7 Annotation Chart Projection harness passed (${negativeCases.length} negative controls)`);
