import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createLightweightAnnotationInteractionPort,
} from '../src/annotation-chart-projection/public.js';
import { createSegmentInteractionController } from '../src/annotation-interaction/public.js';
import { createModuleHost, normalizeModuleDescriptor } from '../src/module-host/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationInteractionPort } from './support/fake-annotation-interaction-port.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-interaction/negative/cases.json',
), 'utf8'));

function segmentGeometry(startEpochMs = 1_700_000_000_000, endEpochMs = 1_700_000_060_000) {
  return geometryContract.createSegmentGeometry({
    endAnchor: geometryContract.createMarketAnchor({
      epochMs: endEpochMs, instrumentId: 'instrument.nq', price: 110,
    }),
    startAnchor: geometryContract.createMarketAnchor({
      epochMs: startEpochMs, instrumentId: 'instrument.nq', price: 100,
    }),
  });
}

function previewProjection(revision = 1, geometry = segmentGeometry()) {
  return createAnnotationProjection({
    entityId: 'preview-entity.segment',
    geometry: geometryContract.readDrawingGeometry(geometry),
    projectionId: 'preview-projection.segment',
    revision,
  });
}

const gatedBase = createFakeAnnotationPrimitiveAdapter();
let releaseAttach;
const attachGate = new Promise((resolve) => { releaseAttach = resolve; });
const gatedAdapter = Object.freeze({
  ...gatedBase,
  async attach(handle) {
    gatedBase.attach(handle);
    await attachGate;
  },
});
const previewOwner = createChartAnnotationPreviewPort({ primitiveAdapter: gatedAdapter });
const previewIdentity = createAnnotationPreviewIdentity('preview.queue');
const firstReplace = previewOwner.replace(previewIdentity, [previewProjection(1)]);
await Promise.resolve();
const secondReplace = previewOwner.replace(previewIdentity, [previewProjection(2)]);
const thirdReplace = previewOwner.replace(previewIdentity, [previewProjection(3)]);
assert.equal(previewOwner.snapshot().queueDepth, 1, 'Preview queue must remain bounded to one latest request');
assert.equal((await secondReplace).outcome, 'superseded');
releaseAttach();
await firstReplace;
await thirdReplace;
assert.equal(gatedBase.inspect().handles.length, 1);
assert.equal(gatedBase.inspect().handles[0].projection.revision, 3);
assert.equal(gatedBase.inspect().counts.update, 1, 'latest queued Preview must replace the same handle');
assert.throws(
  () => previewOwner.clear(createAnnotationPreviewIdentity('preview.foreign')),
  (error) => error.code === 'ANNOTATION_PREVIEW_IDENTITY_MISMATCH',
);
await previewOwner.clear(previewIdentity);
assert.equal(previewOwner.snapshot().projectionCount, 0);
assert.deepEqual(gatedBase.inspect().destroyed, [1]);
await previewOwner.dispose();

const rollbackAdapter = createFakeAnnotationPrimitiveAdapter({ failAt: 'update:1:after' });
const rollbackPreview = createChartAnnotationPreviewPort({ primitiveAdapter: rollbackAdapter });
const rollbackIdentity = createAnnotationPreviewIdentity('preview.rollback');
await rollbackPreview.replace(rollbackIdentity, [previewProjection(1)]);
await assert.rejects(
  rollbackPreview.replace(rollbackIdentity, [previewProjection(2)]),
  (error) => error.code === 'ANNOTATION_PREVIEW_APPLY_FAILED',
);
assert.equal(rollbackAdapter.inspect().handles[0].projection.revision, 1);
assert.equal(rollbackPreview.snapshot().status, 'ready');
await rollbackPreview.clear(rollbackIdentity);
await rollbackPreview.dispose();

const poisonAdapter = createFakeAnnotationPrimitiveAdapter({
  failAt: ['update:1:after', 'update:2:before'],
});
const poisonPreview = createChartAnnotationPreviewPort({ primitiveAdapter: poisonAdapter });
const poisonIdentity = createAnnotationPreviewIdentity('preview.poison');
await poisonPreview.replace(poisonIdentity, [previewProjection(1)]);
await assert.rejects(
  poisonPreview.replace(poisonIdentity, [previewProjection(2)]),
  (error) => error.code === 'ANNOTATION_PREVIEW_ROLLBACK_FAILED',
);
assert.equal(poisonPreview.snapshot().status, 'poisoned');
await poisonPreview.dispose().catch(() => {});

function controllerFixture({ commandFailure = null } = {}) {
  const gesture = createFakeAnnotationInteractionPort();
  const adapter = createFakeAnnotationPrimitiveAdapter();
  const preview = createChartAnnotationPreviewPort({ primitiveAdapter: adapter });
  const commands = [];
  const errors = [];
  const controller = createSegmentInteractionController({
    commandPort: {
      async createDrawing(value) {
        commands.push(value);
        if (commandFailure) throw commandFailure;
        return Object.freeze({ drawingId: `drawing.${value.interactionId}` });
      },
    },
    createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
    geometryContract,
    interactionPort: gesture,
    onError: (error) => errors.push(error),
    previewPort: preview,
    projectPreview: ({ geometry, interactionId, revision }) => createAnnotationProjection({
      entityId: `preview-entity.${interactionId}`,
      geometry: geometryContract.readDrawingGeometry(geometry),
      projectionId: `preview-projection.${interactionId}`,
      revision,
    }),
  });
  return { adapter, commands, controller, errors, gesture, preview };
}

const committed = controllerFixture();
committed.controller.arm({ interactionId: 'commit-one' });
committed.gesture.start(1);
committed.gesture.move(2);
committed.gesture.move(3);
committed.gesture.move(3, { anchor: { price: 999 } });
committed.gesture.end(4);
committed.gesture.repeatEnd(5);
await committed.controller.settle();
assert.equal(committed.commands.length, 1, 'many moves and duplicate end must issue one command');
assert.equal(committed.controller.snapshot().acceptedCommitCount, 1);
assert.equal(committed.controller.snapshot().commandAttemptCount, 1);
assert.equal(committed.controller.snapshot().status, 'idle');
assert.equal(committed.preview.snapshot().projectionCount, 0);
assert.equal(committed.adapter.inspect().handles.length, 1, 'Preview updates must reuse one handle');
await committed.controller.dispose();
await committed.preview.dispose();

for (const reason of ['escape', 'pointer-cancel', 'focus-loss', 'pane-removed']) {
  const cancelled = controllerFixture();
  cancelled.controller.arm({ interactionId: `cancel-${reason}` });
  cancelled.gesture.start(1);
  cancelled.gesture.move(2);
  cancelled.gesture.cancel(reason);
  await cancelled.controller.settle();
  assert.equal(cancelled.commands.length, 0, `${reason} must not commit`);
  assert.equal(cancelled.preview.snapshot().projectionCount, 0, `${reason} must clear Preview`);
  assert.equal(cancelled.controller.snapshot().lastCancelReason, reason);
  await cancelled.controller.dispose();
  await cancelled.preview.dispose();
}

const failedCommand = controllerFixture({ commandFailure: new Error('command failed') });
failedCommand.controller.arm({ interactionId: 'command-failure' });
failedCommand.gesture.start(1);
failedCommand.gesture.move(2);
failedCommand.gesture.end(3);
await failedCommand.controller.settle();
assert.equal(failedCommand.commands.length, 1);
assert.equal(failedCommand.controller.snapshot().acceptedCommitCount, 0);
assert.equal(failedCommand.controller.snapshot().lastErrorCode, 'ANNOTATION_INTERACTION_COMMIT_FAILED');
assert.equal(failedCommand.preview.snapshot().projectionCount, 0);
await failedCommand.controller.dispose();
await failedCommand.preview.dispose();

const disposedGesture = controllerFixture();
disposedGesture.controller.arm({ interactionId: 'dispose-active' });
disposedGesture.gesture.start(1);
disposedGesture.gesture.move(2);
await disposedGesture.controller.dispose();
assert.equal(disposedGesture.commands.length, 0);
assert.equal(disposedGesture.controller.snapshot().status, 'disposed');
assert.equal(disposedGesture.preview.snapshot().projectionCount, 0);
await disposedGesture.preview.dispose();

function fakeEventOwner() {
  return { addEventListener() {}, removeEventListener() {} };
}

function recordingEventOwner(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event = {}) { listeners.get(type)?.(event); },
    listenerCount: () => listeners.size,
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
}

function fakeInteractionEnvironment(overrides = {}) {
  const target = fakeEventOwner();
  const host = {
    ...fakeEventOwner(),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const chartOptions = { crosshair: { mode: 1 }, handleScale: { mouseWheel: true }, handleScroll: { mouseWheel: true } };
  const chart = {
    applyOptions(value) { Object.assign(chartOptions, value); },
    options: () => chartOptions,
    paneSize: () => ({ height: 400, width: 600 }),
    timeScale: () => ({ coordinateToTime: (x) => 1_700_000_000 + Math.round(x) }),
  };
  return {
    chart,
    eventTarget: target,
    host,
    paneId: 'pane-main',
    resolveInstrumentId: () => 'instrument.nq',
    resolveMarketEpochMs: ({ displayEpochMs }) => displayEpochMs,
    series: { coordinateToPrice: (y) => 200 - y },
    ...overrides,
  };
}

const validHandlers = Object.freeze({
  onCancel() {}, onEnd() {}, onMove() {}, onStart() {},
});

const interactionTarget = recordingEventOwner();
const interactionHost = recordingEventOwner({
  getBoundingClientRect: () => ({ left: 10, top: 20 }),
  hasPointerCapture: () => true,
  releasePointerCapture() {},
  setPointerCapture() {},
});
const interactionOptions = {
  crosshair: { mode: 1 },
  handleScale: { axisDoubleClickReset: true, mouseWheel: true },
  handleScroll: { mouseWheel: true, pressedMouseMove: true },
};
const initialInteractionOptions = structuredClone(interactionOptions);
const resolvedDisplayTimes = [];
const interactionEvents = [];
const consumedPointerEvents = [];
const concreteInteraction = createLightweightAnnotationInteractionPort({
  chart: {
    applyOptions(value) { Object.assign(interactionOptions, value); },
    options: () => interactionOptions,
    paneSize: () => ({ height: 300, width: 500 }),
    timeScale: () => ({ coordinateToTime: (x) => 1_700_000_000 + Math.round(x) }),
  },
  dragThresholdPx: 4,
  eventTarget: interactionTarget,
  host: interactionHost,
  paneId: 'pane-main',
  resolveInstrumentId: () => 'instrument.nq',
  resolveMarketEpochMs({ displayEpochMs }) {
    resolvedDisplayTimes.push(displayEpochMs);
    return displayEpochMs + 5_000;
  },
  series: { coordinateToPrice: (y) => 200 - y },
});

function interactionHandlers() {
  return {
    onCancel: ({ reason }) => interactionEvents.push(['cancel', reason]),
    onEnd: (event) => interactionEvents.push(['end', event]),
    onMove: (event) => interactionEvents.push(['move', event]),
    onStart: (event) => interactionEvents.push(['start', event]),
  };
}

function trackedPointerEvent(type, value) {
  const consumed = { defaultPrevented: false, propagationStopped: false, type };
  consumedPointerEvents.push(consumed);
  return {
    ...value,
    preventDefault() { consumed.defaultPrevented = true; },
    stopImmediatePropagation() { consumed.propagationStopped = true; },
  };
}

concreteInteraction.acquire(interactionHandlers());
assert.equal(interactionOptions.handleScale, false);
assert.equal(interactionOptions.handleScroll, false);
interactionHost.dispatch('pointerdown', trackedPointerEvent('ignored-button', {
  button: 1, clientX: 100, clientY: 100, isPrimary: true, pointerId: 1,
}));
interactionHost.dispatch('pointerdown', trackedPointerEvent('outside-plot', {
  button: 0, clientX: 600, clientY: 100, isPrimary: true, pointerId: 1,
}));
assert.equal(interactionEvents.length, 0, 'non-primary-button and outside-plot starts must be ignored');
interactionHost.dispatch('pointerdown', trackedPointerEvent('start', {
  button: 0, clientX: 110, clientY: 120, isPrimary: true, pointerId: 7,
}));
interactionTarget.dispatch('pointermove', trackedPointerEvent('below-threshold', {
  clientX: 112, clientY: 121, pointerId: 7,
}));
assert.deepEqual(interactionEvents.map(([kind]) => kind), ['start']);
interactionTarget.dispatch('pointermove', trackedPointerEvent('move', {
  clientX: 130, clientY: 100, pointerId: 7,
}));
assert.deepEqual(interactionEvents.map(([kind]) => kind), ['start', 'move']);
const normalizedMove = interactionEvents.at(-1)[1];
assert.equal(Object.isFrozen(normalizedMove), true);
assert.equal(Object.isFrozen(normalizedMove.anchor), true);
assert.equal(normalizedMove.anchor.epochMs, resolvedDisplayTimes.at(-1) + 5_000);
assert.equal(normalizedMove.anchor.instrumentId, 'instrument.nq');
interactionTarget.dispatch('pointercancel', trackedPointerEvent('cancel', { pointerId: 7 }));
assert.deepEqual(interactionEvents.at(-1), ['cancel', 'pointer-cancel']);
assert.deepEqual(consumedPointerEvents.map((event) => ({
  defaultPrevented: event.defaultPrevented,
  propagationStopped: event.propagationStopped,
  type: event.type,
})), [
  { defaultPrevented: false, propagationStopped: false, type: 'ignored-button' },
  { defaultPrevented: false, propagationStopped: false, type: 'outside-plot' },
  { defaultPrevented: true, propagationStopped: true, type: 'start' },
  { defaultPrevented: true, propagationStopped: true, type: 'below-threshold' },
  { defaultPrevented: true, propagationStopped: true, type: 'move' },
  { defaultPrevented: true, propagationStopped: true, type: 'cancel' },
]);
assert.deepEqual(interactionOptions, initialInteractionOptions);
assert.equal(concreteInteraction.snapshot().nativeSuppressed, false);

concreteInteraction.acquire(interactionHandlers());
interactionTarget.dispatch('blur');
assert.deepEqual(interactionEvents.at(-1), ['cancel', 'focus-loss']);
assert.deepEqual(interactionOptions, initialInteractionOptions);
concreteInteraction.acquire(interactionHandlers());
let escapePrevented = false;
interactionTarget.dispatch('keydown', {
  key: 'Escape', preventDefault() { escapePrevented = true; },
});
assert.equal(escapePrevented, true);
assert.deepEqual(interactionEvents.at(-1), ['cancel', 'escape']);
assert.deepEqual(interactionOptions, initialInteractionOptions);
concreteInteraction.acquire(interactionHandlers());
concreteInteraction.dispose();
assert.deepEqual(interactionEvents.at(-1), ['cancel', 'disposed']);
assert.deepEqual(interactionOptions, initialInteractionOptions);
assert.equal(interactionHost.listenerCount(), 0);
assert.equal(interactionTarget.listenerCount(), 0);

function validControllerInput(overrides = {}) {
  const gesture = createFakeAnnotationInteractionPort();
  const preview = createChartAnnotationPreviewPort({
    primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
  });
  return {
    commandPort: { async createDrawing() {} },
    createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
    geometryContract,
    interactionPort: gesture,
    previewPort: preview,
    projectPreview: ({ geometry, interactionId, revision }) => createAnnotationProjection({
      entityId: `preview-entity.${interactionId}`,
      geometry: geometryContract.readDrawingGeometry(geometry),
      projectionId: `preview-projection.${interactionId}`,
      revision,
    }),
    ...overrides,
  };
}

const operations = {
  'preview-id': () => createAnnotationPreviewIdentity(' bad'),
  'preview-id-lookalike': () => createChartAnnotationPreviewPort({
    primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
  }).replace({}, []),
  'preview-adapter': () => createChartAnnotationPreviewPort({ primitiveAdapter: {} }),
  'preview-list': () => createChartAnnotationPreviewPort({
    primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
  }).replace(createAnnotationPreviewIdentity('preview.list'), null),
  'preview-list-bound': () => createChartAnnotationPreviewPort({
    primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
  }).replace(createAnnotationPreviewIdentity('preview.list-bound'), Array(9).fill(previewProjection())),
  'preview-id-mismatch': () => {
    const value = createChartAnnotationPreviewPort({
      primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
    });
    void value.replace(createAnnotationPreviewIdentity('preview.left'), []);
    return value.clear(createAnnotationPreviewIdentity('preview.right'));
  },
  'preview-disposed': async () => {
    const value = createChartAnnotationPreviewPort({
      primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
    });
    await value.dispose();
    return value.replace(createAnnotationPreviewIdentity('preview.disposed'), []);
  },
  'interaction-host': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ host: {} })),
  'interaction-event-target': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ eventTarget: {} })),
  'interaction-chart': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ chart: {} })),
  'interaction-series': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ series: {} })),
  'interaction-resolver': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ resolveMarketEpochMs: null })),
  'interaction-pane': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ paneId: ' bad' })),
  'interaction-threshold': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment({ dragThresholdPx: 0 })),
  'interaction-handlers': () => createLightweightAnnotationInteractionPort(fakeInteractionEnvironment()).acquire({}),
  'interaction-active': () => {
    const value = createLightweightAnnotationInteractionPort(fakeInteractionEnvironment());
    value.acquire(validHandlers);
    return value.acquire(validHandlers);
  },
  'interaction-disposed': () => {
    const value = createLightweightAnnotationInteractionPort(fakeInteractionEnvironment());
    value.dispose();
    return value.acquire(validHandlers);
  },
  'controller-geometry': () => createSegmentInteractionController(validControllerInput({ geometryContract: {} })),
  'controller-chart': () => createSegmentInteractionController(validControllerInput({ interactionPort: {} })),
  'controller-preview': () => createSegmentInteractionController(validControllerInput({ previewPort: {} })),
  'controller-command': () => createSegmentInteractionController(validControllerInput({ commandPort: {} })),
  'controller-identity-factory': () => createSegmentInteractionController(validControllerInput({ createPreviewIdentity: null })),
  'controller-projector': () => createSegmentInteractionController(validControllerInput({ projectPreview: null })),
  'controller-callback': () => createSegmentInteractionController(validControllerInput({ onError: true })),
  'arm-fields': () => createSegmentInteractionController(validControllerInput()).arm({ interactionId: 'valid', extra: true }),
  'arm-id': () => createSegmentInteractionController(validControllerInput()).arm({ interactionId: '' }),
  'controller-busy': () => {
    const value = createSegmentInteractionController(validControllerInput());
    value.arm({ interactionId: 'first' });
    return value.arm({ interactionId: 'second' });
  },
  'controller-disposed': async () => {
    const value = createSegmentInteractionController(validControllerInput());
    await value.dispose();
    return value.arm({ interactionId: 'disposed' });
  },
};

async function errorFor(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative operation unexpectedly succeeded');
}

for (const fixture of negativeCases) {
  const error = await errorFor(operations[fixture.operation]);
  assert.equal(error.code, fixture.expectedCode, fixture.name);
}

const descriptorFiles = [
  'src/annotation-geometry-domain/module.json',
  'src/annotation-chart-projection/module.json',
  'src/annotation-interaction/module.json',
];
const descriptors = descriptorFiles.map((file) => normalizeModuleDescriptor(JSON.parse(
  fs.readFileSync(path.join(V7_ROOT, file), 'utf8'),
)));
const interactionDescriptor = descriptors.at(-1);
assert.equal(interactionDescriptor.id, 'optional.annotation-interaction');
assert.deepEqual(interactionDescriptor.requiredPorts, [
  'optional.annotation-chart-projection', 'optional.annotation-geometry-domain',
]);
const publicApis = new Map(await Promise.all(descriptors.map(async (descriptor) => [
  descriptor.id,
  await import(`../${descriptor.publicEntry.replace(/^src\//, 'src/')}`),
])));
const host = createModuleHost(descriptors.map((descriptor) => (
  descriptor.lifecycle.includes('dispose')
    ? {
        descriptor,
        instantiate: () => ({ dispose() {}, publicApi: publicApis.get(descriptor.id) }),
      }
    : { descriptor, publicApi: publicApis.get(descriptor.id) }
)));
await host.start();
assert.equal(host.getPublicApi(interactionDescriptor.id), publicApis.get(interactionDescriptor.id));
await host.stop();

const controllerSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-interaction'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-interaction', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  'addEventListener', 'removeEventListener', 'HTMLElement', 'document.', 'window.',
  'lightweight-charts', 'series.', 'chart.', '../replay-', '../bar-data-', '../workspace-',
  '../annotation-runtime/', 'imbalance.fvg', 'liquidity.bsl', 'liquidity.eql',
]) assert.equal(controllerSource.includes(forbidden), false, `controller source contains ${forbidden}`);

const chartSource = fs.readdirSync(path.join(V7_ROOT, 'src/annotation-chart-projection'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/annotation-chart-projection', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  '../annotation-runtime/', '../replay-', '../bar-data-', '../workspace-',
  'imbalance.fvg', 'liquidity.bsl', 'liquidity.eql',
]) assert.equal(chartSource.includes(forbidden), false, `Chart interaction source contains ${forbidden}`);

const repositoryRoot = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-annotation-interaction-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-interaction/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1100,700',
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
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-interaction/`,
  });
  await waitFor(cdp, `document.querySelector('#chart')?.dataset.scenario === 'ready'`, 15_000);
  const rect = await evaluate(cdp, `(() => {
    const value = document.querySelector('#chart').getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height };
  })()`);
  const start = { x: rect.left + (rect.width * 0.28), y: rect.top + (rect.height * 0.68) };
  const end = { x: rect.left + (rect.width * 0.66), y: rect.top + (rect.height * 0.34) };

  await evaluate(cdp, 'globalThis.__annotationInteractionFixture.arm()');
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...start });
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, type: 'mouseMoved', ...end });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const previewPixels = await evaluate(cdp, 'globalThis.__annotationInteractionFixture.coloredPixels()');
  assert.ok(previewPixels.cyan > 10, 'drag must paint a visible cyan Preview');
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...end });
  await waitFor(cdp, `globalThis.__annotationInteractionFixture.snapshot().controller.acceptedCommitCount === 1`, 10_000);
  const committedBrowser = await evaluate(cdp, 'globalThis.__annotationInteractionFixture.snapshot()');
  assert.equal(committedBrowser.fixtureCommitCount, 1);
  assert.equal(committedBrowser.preview.projectionCount, 0);
  assert.equal(committedBrowser.accepted.projectionCount, 1);
  assert.equal(committedBrowser.beforeData, committedBrowser.afterData);
  assert.equal(committedBrowser.nativeOptionsRestored, true);
  const acceptedPixels = await evaluate(cdp, 'globalThis.__annotationInteractionFixture.coloredPixels()');
  assert.ok(acceptedPixels.lime > 10, 'pointer-up must leave one visible accepted Segment');
  assert.equal(acceptedPixels.cyan, 0, 'pointer-up must clear transient Preview pixels');

  await evaluate(cdp, 'globalThis.__annotationInteractionFixture.arm()');
  const cancelEnd = { x: rect.left + (rect.width * 0.75), y: rect.top + (rect.height * 0.55) };
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...start });
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, type: 'mouseMoved', ...cancelEnd });
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.ok((await evaluate(cdp, 'globalThis.__annotationInteractionFixture.coloredPixels()')).cyan > 10);
  await cdp.send('Input.dispatchKeyEvent', { key: 'Escape', code: 'Escape', type: 'keyDown' });
  await cdp.send('Input.dispatchKeyEvent', { key: 'Escape', code: 'Escape', type: 'keyUp' });
  await waitFor(cdp, `globalThis.__annotationInteractionFixture.snapshot().controller.status === 'idle'`, 10_000);
  const cancelledBrowser = await evaluate(cdp, 'globalThis.__annotationInteractionFixture.snapshot()');
  assert.equal(cancelledBrowser.fixtureCommitCount, 1);
  assert.equal(cancelledBrowser.preview.projectionCount, 0);
  assert.equal(cancelledBrowser.nativeOptionsRestored, true);
  assert.equal((await evaluate(cdp, 'globalThis.__annotationInteractionFixture.coloredPixels()')).cyan, 0);

  const nativeBefore = cancelledBrowser.visibleLogicalRange;
  const nativeStart = { x: rect.left + (rect.width * 0.55), y: rect.top + (rect.height * 0.50) };
  await cdp.send('Input.dispatchMouseEvent', {
    deltaX: -240,
    deltaY: 0,
    type: 'mouseWheel',
    ...nativeStart,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const nativeAfter = (await evaluate(cdp, 'globalThis.__annotationInteractionFixture.snapshot()')).visibleLogicalRange;
  assert.notEqual(nativeAfter.from, nativeBefore.from, 'ordinary native scrolling must work after cancel');

  await evaluate(cdp, 'globalThis.__annotationInteractionFixture.dispose()');
  await waitFor(cdp, 'globalThis.__annotationInteractionDisposed?.controller.status === "disposed"', 10_000);
  const disposedBrowser = await evaluate(cdp, 'globalThis.__annotationInteractionDisposed');
  assert.equal(disposedBrowser.interaction.disposed, true);
  assert.equal(disposedBrowser.preview.status, 'disposed');
  assert.equal(disposedBrowser.accepted.status, 'disposed');
} finally {
  if (cdp) cdp.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => chrome.once('exit', resolve));
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 100,
  });
}

console.log(`v7 Annotation Interaction harness passed (${negativeCases.length} negative controls)`);
