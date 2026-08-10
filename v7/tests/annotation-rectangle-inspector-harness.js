import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import * as presentationContract from '../src/annotation-runtime/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createLightweightAnnotationInteractionPort,
  createRectangleRenderPrimitive,
  readAnnotationProjection,
} from '../src/annotation-chart-projection/public.js';
import {
  createDrawingInspectorController,
  createRectangleInteractionController,
} from '../src/annotation-interaction/public.js';
import {
  createAnnotationRuntime,
  createDrawingId,
  createDrawingProvenance,
} from '../src/annotation-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createFakeAnnotationInteractionPort } from './support/fake-annotation-interaction-port.js';
import { createFakeAnnotationPrimitiveAdapter } from './support/fake-annotation-primitive-adapter.js';
import { createFakeAnnotationRepository } from './support/fake-annotation-repository.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/annotation-rectangle-inspector/negative/cases.json',
), 'utf8'));
const sessionId = createSessionId('session.r13-6');
const provenance = createDrawingProvenance({
  createdAtEpochMs: 2_000,
  observedAtReplayCutoffEpochMs: 2_000,
  origin: 'manual',
});

function rectangleGeometry(start = 1_000, end = 2_000, low = 100, high = 110) {
  return geometryContract.createRectangleGeometry({
    firstAnchor: geometryContract.createMarketAnchor({
      epochMs: start, instrumentId: 'instrument.nq', price: low,
    }),
    secondAnchor: geometryContract.createMarketAnchor({
      epochMs: end, instrumentId: 'instrument.nq', price: high,
    }),
  });
}

function segmentGeometry() {
  return geometryContract.createSegmentGeometry({
    endAnchor: geometryContract.createMarketAnchor({
      epochMs: 2_000, instrumentId: 'instrument.nq', price: 110,
    }),
    startAnchor: geometryContract.createMarketAnchor({
      epochMs: 1_000, instrumentId: 'instrument.nq', price: 100,
    }),
  });
}

function presentation(overrides = {}) {
  return presentationContract.createDrawingPresentation({
    fillColor: '#123456',
    fillOpacity: 0.25,
    schemaVersion: 1,
    strokeColor: '#abcdef',
    strokeWidth: 3,
    ...overrides,
  });
}

function projection(geometry = rectangleGeometry(), overrides = {}) {
  return createAnnotationProjection({
    entityId: 'drawing.rectangle',
    geometry: geometryContract.readDrawingGeometry(geometry),
    presentation: presentationContract.readDrawingPresentation(presentation()),
    projectionId: 'projection.rectangle',
    revision: 1,
    ...overrides,
  });
}

const normalizedPresentation = presentation({ fillColor: '#ABCDEF', strokeColor: '#FEDCBA' });
assert.deepEqual(presentationContract.readDrawingPresentation(normalizedPresentation), {
  fillColor: '#abcdef', fillOpacity: 0.25, schemaVersion: 1, strokeColor: '#fedcba', strokeWidth: 3,
});
assert.deepEqual(presentationContract.readDrawingPresentation(
  presentationContract.createDefaultDrawingPresentation(),
), {
  fillColor: '#38bdf8', fillOpacity: 0.18, schemaVersion: 1, strokeColor: '#38bdf8', strokeWidth: 2,
});

const repository = createFakeAnnotationRepository();
const runtime = createAnnotationRuntime({ geometryContract, repository, sessionId });
const rectangleId = createDrawingId('drawing.rectangle');
await runtime.createDrawing({
  drawingId: rectangleId,
  expectedDocumentRevision: 0,
  geometry: rectangleGeometry(),
  presentation: normalizedPresentation,
  provenance,
  sessionId,
});
const revised = await runtime.reviseDrawing({
  drawingId: rectangleId,
  expectedDocumentRevision: 1,
  expectedDrawingRevision: 1,
  geometry: rectangleGeometry(1_200, 2_400, 99, 115),
  presentation: presentation({ fillOpacity: 0.5, strokeWidth: 5 }),
  sessionId,
});
assert.equal(revised.revision, 2);
assert.equal(revised.drawings[0].revision, 2);
assert.equal(revised.drawings[0].geometry.payload.lowPrice, 99);
assert.equal(revised.drawings[0].presentation.strokeWidth, 5);

function revisionRepository(failFinalizeAt) {
  let finalizeCount = 0;
  let visible = null;
  return Object.freeze({
    prepare({ candidateDocument }) {
      const previous = visible;
      let phase = 'prepared';
      return Object.freeze({
        async apply() { visible = candidateDocument; phase = 'applied'; },
        async finalize() {
          finalizeCount += 1;
          if (finalizeCount === failFinalizeAt) throw new Error('intentional revise finalize failure');
          phase = 'finalized';
        },
        async rollback() { visible = previous; phase = 'rolled-back'; },
        snapshot: () => Object.freeze({ phase }),
      });
    },
  });
}

const rollbackRepository = revisionRepository(2);
const rollbackRuntime = createAnnotationRuntime({ geometryContract, repository: rollbackRepository, sessionId });
await rollbackRuntime.createDrawing({
  drawingId: rectangleId, expectedDocumentRevision: 0, geometry: rectangleGeometry(),
  presentation: presentation(), provenance, sessionId,
});
const beforeFailedRevise = rollbackRuntime.getDocument();
await rollbackRuntime.reviseDrawing({
  drawingId: rectangleId, expectedDocumentRevision: 1, expectedDrawingRevision: 1,
  geometry: rectangleGeometry(1_100, 2_100, 95, 120),
  presentation: presentation({ fillOpacity: 0.9 }), sessionId,
}).catch(() => {});
assert.equal(
  rollbackRuntime.getDocument(),
  beforeFailedRevise,
  'failed Geometry and Presentation revision must restore the exact accepted document',
);

let requestedUpdates = 0;
const rectangle = createRectangleRenderPrimitive(projection());
rectangle.primitive.attached({
  chart: { timeScale: () => ({ timeToCoordinate: (time) => time - 0.5 }) },
  requestUpdate() { requestedUpdates += 1; },
  series: { priceToCoordinate: (price) => 200 - price },
});
rectangle.primitive.updateAllViews();
assert.deepEqual(rectangle.hitTest({ x: 1, y: 95, tolerancePx: 4 }), {
  distancePx: 0,
  entityId: 'drawing.rectangle',
  projectionId: 'projection.rectangle',
});
assert.equal(rectangle.hitTest({ x: 50, y: 50, tolerancePx: 4 }), null);
assert.ok(requestedUpdates > 0);
rectangle.primitive.detached();
rectangle.destroy();

const slotDraws = [];
const slotRectangle = createRectangleRenderPrimitive(projection(), {
  centerOnStartAnchorSlot: true,
});
slotRectangle.primitive.attached({
  chart: { timeScale: () => ({ timeToCoordinate: (time) => time * 10 }) },
  requestUpdate() {},
  series: { priceToCoordinate: (price) => 200 - price },
});
slotRectangle.primitive.paneViews()[0].renderer().draw({
  useBitmapCoordinateSpace(callback) {
    callback({
      context: {
        fillRect: (...args) => slotDraws.push(args),
        restore() {}, save() {}, strokeRect() {},
      },
      horizontalPixelRatio: 1,
      verticalPixelRatio: 1,
    });
  },
});
assert.deepEqual(slotDraws, [[5, 90, 10, 10]], 'Bar highlight must center one slot on the first anchor');
slotRectangle.primitive.detached();
slotRectangle.destroy();
assert.throws(
  () => createRectangleRenderPrimitive(projection(), { centerOnStartAnchorSlot: 'yes' }),
  (error) => error.code === 'ANNOTATION_RECTANGLE_OPTIONS_INVALID',
);

function previewProjection({ drawingId = 'drawing.preview', geometry, presentation: style = presentation(),
  projectionId = 'projection.preview', revision }) {
  return createAnnotationProjection({
    entityId: drawingId,
    geometry: geometryContract.readDrawingGeometry(geometry),
    presentation: presentationContract.readDrawingPresentation(style),
    projectionId,
    revision,
  });
}

const rectangleGesture = createFakeAnnotationInteractionPort();
const rectanglePreview = createChartAnnotationPreviewPort({
  primitiveAdapter: createFakeAnnotationPrimitiveAdapter(),
});
const rectangleCommands = [];
const rectangleController = createRectangleInteractionController({
  commandPort: { async createDrawing(value) { rectangleCommands.push(value); } },
  createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
  geometryContract,
  interactionPort: rectangleGesture,
  previewPort: rectanglePreview,
  projectPreview: ({ geometry, interactionId, revision }) => previewProjection({
    drawingId: `drawing.${interactionId}`,
    geometry,
    projectionId: `projection.${interactionId}`,
    revision,
  }),
});
rectangleController.arm({ interactionId: 'rectangle-one' });
rectangleGesture.start(1);
rectangleGesture.move(2);
rectangleGesture.end(3);
await rectangleController.settle();
assert.equal(rectangleCommands.length, 1);
assert.equal(geometryContract.readDrawingGeometry(rectangleCommands[0].geometry).typeId, 'geometry.rectangle');
assert.equal(rectanglePreview.snapshot().projectionCount, 0);

function inspectorFixture({ geometry = rectangleGeometry(), style = presentation() } = {}) {
  const adapter = createFakeAnnotationPrimitiveAdapter();
  const previewPort = createChartAnnotationPreviewPort({ primitiveAdapter: adapter });
  const saves = [];
  const drawing = Object.freeze({
    drawingId: 'drawing.inspect', geometry: geometryContract.readDrawingGeometry(geometry),
    presentation: presentationContract.readDrawingPresentation(style), revision: 3, status: 'active',
  });
  const controller = createDrawingInspectorController({
    createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
    drawingPort: {
      readDrawing: async () => Object.freeze({ documentRevision: 7, drawing }),
      async reviseDrawing(value) { saves.push(value); },
    },
    geometryContract,
    presentationContract,
    previewPort,
    projectPreview: ({ drawingId, geometry: draft, presentation: draftStyle, projectionId, revision }) => (
      previewProjection({ drawingId, geometry: draft, presentation: draftStyle, projectionId, revision })
    ),
  });
  return { adapter, controller, previewPort, saves };
}

const inspected = inspectorFixture();
await inspected.controller.select({ drawingId: 'drawing.inspect', projectionId: 'projection.inspect' });
assert.equal(inspected.controller.snapshot().draftRevision, 1);
assert.equal(inspected.previewPort.snapshot().projectionCount, 1);
await inspected.controller.updateDraft({ expectedDraftRevision: 1, field: 'fillOpacity', value: 0.7 });
assert.equal(inspected.controller.snapshot().dirty, true);
await inspected.controller.save();
assert.equal(inspected.saves.length, 1);
assert.equal(presentationContract.readDrawingPresentation(inspected.saves[0].presentation).fillOpacity, 0.7);
assert.equal(inspected.previewPort.snapshot().projectionCount, 0);

function eventOwner(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event) { listeners.get(type)?.(event); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
}

const eventTarget = eventOwner();
const host = eventOwner({ getBoundingClientRect: () => ({ left: 0, top: 0 }) });
const selectionEvents = [];
const selectionPort = createLightweightAnnotationInteractionPort({
  chart: {
    applyOptions() {}, options: () => ({ handleScale: {}, handleScroll: {} }),
    paneSize: () => ({ height: 300, width: 500 }),
    timeScale: () => ({ coordinateToTime: (x) => x }),
  },
  eventTarget,
  host,
  resolveInstrumentId: () => 'instrument.nq',
  resolveMarketEpochMs: ({ displayEpochMs }) => displayEpochMs,
  resolveSelectionAt: ({ x, y }) => Object.freeze({
    distancePx: 0, entityId: `drawing.${x}`, projectionId: `projection.${y}`,
  }),
  series: { coordinateToPrice: (y) => y },
});
const subscription = selectionPort.subscribeSelection((value) => selectionEvents.push(value));
host.dispatch('pointerdown', { button: 0, clientX: 40, clientY: 50, isPrimary: true, pointerId: 2 });
eventTarget.dispatch('pointerup', { clientX: 40, clientY: 50, pointerId: 2 });
assert.equal(selectionEvents.length, 1);
assert.equal(selectionEvents[0].hit.entityId, 'drawing.40');
host.dispatch('pointerdown', { button: 0, clientX: 40, clientY: 50, isPrimary: true, pointerId: 3 });
eventTarget.dispatch('pointermove', { clientX: 80, clientY: 90, pointerId: 3 });
eventTarget.dispatch('pointerup', { clientX: 80, clientY: 90, pointerId: 3 });
assert.equal(selectionEvents.length, 1, 'native drag must not become selection');
subscription.unsubscribe();
selectionPort.dispose();

function validInspectorInput(overrides = {}) {
  const fixture = inspectorFixture();
  return {
    createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
    drawingPort: {
      readDrawing: async () => Object.freeze({
        documentRevision: 7,
        drawing: Object.freeze({
          drawingId: 'drawing.inspect', geometry: geometryContract.readDrawingGeometry(rectangleGeometry()),
          presentation: presentationContract.readDrawingPresentation(presentation()), revision: 1, status: 'active',
        }),
      }),
      async reviseDrawing() {},
    },
    geometryContract,
    presentationContract,
    previewPort: fixture.previewPort,
    projectPreview: ({ drawingId, geometry, presentation: style, projectionId, revision }) => (
      previewProjection({ drawingId, geometry, presentation: style, projectionId, revision })
    ),
    ...overrides,
  };
}

const invalidPresentation = (overrides = {}) => ({
  fillColor: '#123456', fillOpacity: 0.25, schemaVersion: 1,
  strokeColor: '#abcdef', strokeWidth: 3, ...overrides,
});

async function runtimeWithDrawing() {
  const value = createAnnotationRuntime({
    geometryContract, repository: createFakeAnnotationRepository(), sessionId,
  });
  await value.createDrawing({
    drawingId: rectangleId, expectedDocumentRevision: 0, geometry: rectangleGeometry(),
    presentation: presentation(), provenance, sessionId,
  });
  return value;
}

async function reviseInput(overrides = {}) {
  const value = await runtimeWithDrawing();
  return {
    input: {
      drawingId: rectangleId,
      expectedDocumentRevision: 1,
      expectedDrawingRevision: 1,
      geometry: rectangleGeometry(),
      presentation: presentation(),
      sessionId,
      ...overrides,
    },
    value,
  };
}

const operations = {
  'presentation-fields': () => presentationContract.createDrawingPresentation({
    ...invalidPresentation(), extra: true,
  }),
  'presentation-schema': () => presentationContract.createDrawingPresentation(invalidPresentation({ schemaVersion: 2 })),
  'presentation-stroke-color': () => presentationContract.createDrawingPresentation(invalidPresentation({ strokeColor: 'red' })),
  'presentation-fill-color': () => presentationContract.createDrawingPresentation(invalidPresentation({ fillColor: '#123' })),
  'presentation-width-low': () => presentationContract.createDrawingPresentation(invalidPresentation({ strokeWidth: 0 })),
  'presentation-width-high': () => presentationContract.createDrawingPresentation(invalidPresentation({ strokeWidth: 13 })),
  'presentation-opacity-low': () => presentationContract.createDrawingPresentation(invalidPresentation({ fillOpacity: -0.1 })),
  'presentation-opacity-high': () => presentationContract.createDrawingPresentation(invalidPresentation({ fillOpacity: 1.1 })),
  'presentation-lookalike': () => presentationContract.readDrawingPresentation(invalidPresentation()),
  'revise-fields': async () => {
    const { input, value } = await reviseInput({ extra: true });
    return value.reviseDrawing(input);
  },
  'revise-document-stale': async () => {
    const { input, value } = await reviseInput({ expectedDocumentRevision: 0 });
    return value.reviseDrawing(input);
  },
  'revise-drawing-stale': async () => {
    const { input, value } = await reviseInput({ expectedDrawingRevision: 2 });
    return value.reviseDrawing(input);
  },
  'revise-presentation-lookalike': async () => {
    const { input, value } = await reviseInput({ presentation: invalidPresentation() });
    return value.reviseDrawing(input);
  },
  'revise-archived': async () => {
    const { input, value } = await reviseInput({
      expectedDocumentRevision: 2, expectedDrawingRevision: 2,
    });
    await value.archiveDrawing({
      drawingId: rectangleId, expectedDocumentRevision: 1,
      expectedDrawingRevision: 1, sessionId,
    });
    return value.reviseDrawing(input);
  },
  'projection-presentation': () => createAnnotationProjection({
    entityId: 'drawing.rectangle',
    geometry: geometryContract.readDrawingGeometry(rectangleGeometry()),
    presentation: invalidPresentation({ strokeColor: '#ABCDEF' }),
    projectionId: 'projection.rectangle',
    revision: 1,
  }),
  'rectangle-geometry': () => createRectangleRenderPrimitive(projection(segmentGeometry())),
  'rectangle-options': () => createRectangleRenderPrimitive(projection(), { fillOpacity: 2 }),
  'rectangle-attach': () => createRectangleRenderPrimitive(projection()).primitive.attached({}),
  'rectangle-controller-geometry': () => createRectangleInteractionController({
    commandPort: { async createDrawing() {} }, createPreviewIdentity() {}, geometryContract: {},
    interactionPort: createFakeAnnotationInteractionPort(), previewPort: rectanglePreview,
    projectPreview() {},
  }),
  'inspector-drawing-port': () => createDrawingInspectorController(validInspectorInput({ drawingPort: {} })),
  'inspector-selection': () => createDrawingInspectorController(validInspectorInput()).select({
    drawingId: 'drawing.inspect', projectionId: 'projection.inspect', extra: true,
  }),
  'inspector-stale': async () => {
    const value = createDrawingInspectorController(validInspectorInput());
    await value.select({ drawingId: 'drawing.inspect', projectionId: 'projection.inspect' });
    return value.updateDraft({ expectedDraftRevision: 0, field: 'strokeWidth', value: 2 });
  },
  'inspector-segment-fill': async () => {
    const input = validInspectorInput();
    input.drawingPort = {
      ...input.drawingPort,
      readDrawing: async () => Object.freeze({
        documentRevision: 1,
        drawing: Object.freeze({
          drawingId: 'drawing.inspect', geometry: geometryContract.readDrawingGeometry(segmentGeometry()),
          presentation: presentationContract.readDrawingPresentation(presentation()), revision: 1, status: 'active',
        }),
      }),
    };
    const value = createDrawingInspectorController(input);
    await value.select({ drawingId: 'drawing.inspect', projectionId: 'projection.inspect' });
    return value.updateDraft({ expectedDraftRevision: 1, field: 'fillOpacity', value: 0.4 });
  },
};

async function errorFor(operation) {
  try { await operation(); } catch (error) { return error; }
  assert.fail('negative operation unexpectedly succeeded');
}

for (const testCase of negativeCases) {
  const error = await errorFor(operations[testCase.operation]);
  assert.equal(error.code, testCase.expectedCode, testCase.name);
}

const repositoryRoot = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-rectangle-inspector-'));
const server = createStaticServer(repositoryRoot, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/annotation-rectangle-inspector/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1400,850',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const file = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/)[0];
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
    url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/annotation-rectangle-inspector/`,
  });
  await waitFor(cdp, `document.querySelector('#chart')?.dataset.scenario === 'ready'`, 15_000);
  const rect = await evaluate(cdp, `(() => {
    const value = document.querySelector('#chart').getBoundingClientRect();
    return { left: value.left, top: value.top, width: value.width, height: value.height };
  })()`);
  const start = { x: rect.left + (rect.width * 0.30), y: rect.top + (rect.height * 0.70) };
  const end = { x: rect.left + (rect.width * 0.68), y: rect.top + (rect.height * 0.35) };
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.armRectangle()');
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...start });
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...start });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().interaction.gesturePhase === "placing"', 10_000);
  await cdp.send('Input.dispatchMouseEvent', { button: 'none', buttons: 0, type: 'mouseMoved', ...end });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().preview.projectionCount === 1', 10_000);
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...end });
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...end });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().controller.acceptedCommitCount === 1', 10_000);
  const accepted = await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot()');
  assert.equal(accepted.document.drawings.length, 2);
  assert.equal(accepted.accepted.projectionCount, 2);
  assert.equal(accepted.preview.projectionCount, 0);
  assert.equal(accepted.beforeData, accepted.afterData);
  assert.equal(accepted.nativeOptionsRestored, true);

  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...center });
  await cdp.send('Input.dispatchMouseEvent', { button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...center });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().inspector.status === "selected"', 10_000);
  const selected = await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot()');
  assert.equal(selected.inspector.controls.geometryTypeId, 'geometry.rectangle');
  assert.equal(selected.inspectorPreview.projectionCount, 1);
  await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.updateField("fillOpacity", 0.62)');
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().inspector.dirty === true', 10_000);
  await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.save()');
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().inspector.status === "idle"', 10_000);
  const saved = await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot()');
  assert.equal(saved.document.revision, 3);
  assert.equal(saved.document.drawings.find((item) => item.geometry.typeId === 'geometry.rectangle')
    .presentation.fillOpacity, 0.62);
  assert.equal(saved.inspectorPreview.projectionCount, 0);

  const beforeSegmentSelectionPixels = await evaluate(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.coloredPixels()',
  );
  const segmentPoint = await evaluate(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.seededSegmentClientPoint()',
  );
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...segmentPoint,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...segmentPoint,
  });
  await waitFor(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.snapshot().inspector.controls?.geometryTypeId === "geometry.segment"',
    10_000,
  );
  const segmentUi = await evaluate(cdp, `(() => ({
    endPriceHidden: document.querySelector('#end-price-label').hidden,
    fillColorHidden: document.querySelector('#fill-color-label').hidden,
    fillOpacityHidden: document.querySelector('#fill-opacity-label').hidden,
    startPriceHidden: document.querySelector('#start-price-label').hidden,
  }))()`);
  assert.deepEqual(segmentUi, {
    endPriceHidden: false,
    fillColorHidden: true,
    fillOpacityHidden: true,
    startPriceHidden: false,
  });
  const selectedSegmentPixels = await evaluate(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.coloredPixels()',
  );
  assert.ok(
    selectedSegmentPixels.white > beforeSegmentSelectionPixels.white,
    'selected Segment Preview must add two visible endpoint handles',
  );

  const beforeSecondaryCancel = await evaluate(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.snapshot()',
  );
  await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.armRectangle()');
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 1, clickCount: 1, type: 'mousePressed', ...start,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'left', buttons: 0, clickCount: 1, type: 'mouseReleased', ...start,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'none', buttons: 0, type: 'mouseMoved', ...end,
  });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().preview.projectionCount === 1', 10_000);
  await evaluate(cdp, `(() => {
    globalThis.__annotationContextMenuBubbleCount = 0;
    document.addEventListener('contextmenu', () => {
      globalThis.__annotationContextMenuBubbleCount += 1;
    });
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'right', buttons: 2, clickCount: 1, type: 'mousePressed', ...end,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    button: 'right', buttons: 0, clickCount: 1, type: 'mouseReleased', ...end,
  });
  await waitFor(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot().controller.status === "idle"', 10_000);
  const secondaryCancelled = await evaluate(
    cdp,
    'globalThis.__annotationRectangleInspectorFixture.snapshot()',
  );
  assert.equal(secondaryCancelled.controller.lastCancelReason, 'secondary-button');
  assert.equal(secondaryCancelled.document.revision, beforeSecondaryCancel.document.revision);
  assert.equal(secondaryCancelled.document.drawings.length, beforeSecondaryCancel.document.drawings.length);
  assert.equal(secondaryCancelled.preview.projectionCount, 0);
  assert.equal(
    await evaluate(cdp, 'globalThis.__annotationContextMenuBubbleCount'),
    0,
    'a real secondary-button sequence must not reach the browser context-menu path',
  );

  const nativeBefore = secondaryCancelled.visibleLogicalRange;
  await cdp.send('Input.dispatchMouseEvent', { deltaX: -180, deltaY: 0, type: 'mouseWheel', ...center });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const nativeAfter = (await evaluate(cdp, 'globalThis.__annotationRectangleInspectorFixture.snapshot()'))
    .visibleLogicalRange;
  assert.notEqual(nativeAfter.from, nativeBefore.from, 'native Chart navigation must remain available');
} finally {
  if (cdp) cdp.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => chrome.once('exit', resolve));
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 100,
  });
}

await inspected.controller.dispose();
await inspected.previewPort.dispose();
await rectangleController.dispose();
await rectanglePreview.dispose();
await runtime.dispose();
await rollbackRuntime.dispose();

console.log(`v7 Rectangle And Minimal Inspector harness passed (${negativeCases.length} negative controls)`);
