import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import * as presentationContract from '../../../src/annotation-runtime/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createChartAnnotationProjectionPort,
  createLightweightAnnotationInteractionPort,
  createLightweightSeriesPrimitiveAdapter,
  createRectangleRenderPrimitive,
  createSegmentRenderPrimitive,
  readAnnotationProjection,
} from '../../../src/annotation-chart-projection/public.js';
import {
  createDrawingInspectorController,
  createRectangleInteractionController,
} from '../../../src/annotation-interaction/public.js';
import { createAnnotationRuntime, createDrawingId, createDrawingProvenance } from '../../../src/annotation-runtime/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';

const host = document.querySelector('#chart');
const armButton = document.querySelector('#arm-rectangle');
const cancelToolButton = document.querySelector('#cancel-tool');
const status = document.querySelector('#status');
const inspectorForm = document.querySelector('#inspector');
const emptyInspector = document.querySelector('#empty');
const selectedId = document.querySelector('#selected-id');
const chart = createChart(host, {
  autoSize: true,
  layout: { background: { color: '#05070a' }, textColor: '#a8b1bd' },
  rightPriceScale: { autoScale: false },
});
const series = chart.addSeries(CandlestickSeries, {
  downColor: '#f23645', borderVisible: false, upColor: '#089981',
  wickDownColor: '#f23645', wickUpColor: '#089981',
});
const bars = Object.freeze(Array.from({ length: 80 }, (_, index) => Object.freeze({
  close: 100 + (index * 0.35) + (index % 4 === 0 ? 1.4 : -0.4),
  high: 102 + (index * 0.35),
  low: 98 + (index * 0.35),
  open: 100 + (index * 0.35),
  time: 1_700_000_000 + (index * 60),
})));
series.setData(bars);
chart.timeScale().setVisibleLogicalRange({ from: 10, to: 60 });
const beforeData = JSON.stringify(series.data());
const initialNativeOptions = JSON.stringify({
  crosshair: chart.options().crosshair,
  handleScale: chart.options().handleScale,
  handleScroll: chart.options().handleScroll,
});

function primitiveFor(projection, options = {}) {
  const value = readAnnotationProjection(projection);
  if (value.geometry.typeId === 'geometry.segment') {
    return createSegmentRenderPrimitive(projection, options.segment ?? {});
  }
  return createRectangleRenderPrimitive(projection, options.rectangle ?? {});
}

function primitiveAdapter(options = {}) {
  return createLightweightSeriesPrimitiveAdapter({
    createPrimitive: (projection) => primitiveFor(projection, options),
    series,
  });
}

const acceptedPort = createChartAnnotationProjectionPort({ primitiveAdapter: primitiveAdapter() });
const drawingPreviewPort = createChartAnnotationPreviewPort({
  primitiveAdapter: primitiveAdapter({
    rectangle: { fillColor: '#22d3ee', fillOpacity: 0.24, strokeColor: '#22d3ee', strokeWidth: 3 },
  }),
});
const inspectorPreviewPort = createChartAnnotationPreviewPort({
  primitiveAdapter: primitiveAdapter({
    rectangle: { handleColor: '#f8fafc', showHandles: true },
    segment: { handleColor: '#f8fafc', handleRadius: 5, showHandles: true },
  }),
});
const sessionId = createSessionId('session.r13-6-fixture');

function createFixtureRepository() {
  let visible = null;
  return Object.freeze({
    prepare({ candidateDocument }) {
      const previous = visible;
      let phase = 'prepared';
      return Object.freeze({
        async apply() { visible = candidateDocument; phase = 'applied'; },
        async finalize() { phase = 'finalized'; },
        async rollback() { visible = previous; phase = 'rolled-back'; },
        snapshot: () => Object.freeze({ phase }),
      });
    },
  });
}

const runtime = createAnnotationRuntime({
  geometryContract,
  repository: createFixtureRepository(),
  sessionId,
});
const provenance = createDrawingProvenance({
  createdAtEpochMs: 1_700_004_800_000,
  observedAtReplayCutoffEpochMs: 1_700_004_800_000,
  origin: 'manual',
});
const defaultPresentation = presentationContract.createDefaultDrawingPresentation();
const drawingIds = new Map();
let drawingSequence = 0;
let interactionSequence = 0;

function projectionForDrawing(drawing) {
  const input = {
    entityId: drawing.drawingId,
    geometry: drawing.geometry,
    projectionId: `projection.${drawing.drawingId}`,
    revision: drawing.revision,
  };
  if (drawing.presentation !== null) input.presentation = drawing.presentation;
  return createAnnotationProjection(input);
}

async function synchronize(document) {
  const projections = document.drawings
    .filter(({ status: drawingStatus }) => drawingStatus === 'active')
    .map(projectionForDrawing);
  const prepared = acceptedPort.prepare(document.revision, projections);
  const receipt = await acceptedPort.apply(prepared);
  await acceptedPort.finalize(prepared, receipt);
}

function allocateDrawingId(kind) {
  const token = `drawing.${kind}-${++drawingSequence}`;
  const drawingId = createDrawingId(token);
  drawingIds.set(token, drawingId);
  return drawingId;
}

async function createAcceptedDrawing(kind, geometry) {
  const drawingId = allocateDrawingId(kind);
  const document = await runtime.createDrawing({
    drawingId,
    expectedDocumentRevision: runtime.getDocument().revision,
    geometry,
    presentation: defaultPresentation,
    provenance,
    sessionId,
  });
  await synchronize(document);
  return document.drawings.find((drawing) => drawing.drawingId === presentationContract.readDrawingId(drawingId));
}

await createAcceptedDrawing('segment', geometryContract.createSegmentGeometry({
  endAnchor: geometryContract.createMarketAnchor({
    epochMs: 1_700_003_360_000, instrumentId: 'instrument.nq', price: 116,
  }),
  startAnchor: geometryContract.createMarketAnchor({
    epochMs: 1_700_001_800_000, instrumentId: 'instrument.nq', price: 107,
  }),
}));

const chartInteractionPort = createLightweightAnnotationInteractionPort({
  chart,
  host,
  paneId: 'pane-main',
  resolveInstrumentId: () => 'instrument.nq',
  resolveMarketEpochMs: ({ displayEpochMs }) => displayEpochMs,
  resolveSelectionAt: (point) => acceptedPort.hitTest(point),
  series,
});

function previewProjection({ drawingId, geometry, presentation, projectionId, revision }) {
  return createAnnotationProjection({
    entityId: drawingId,
    geometry: geometryContract.readDrawingGeometry(geometry),
    presentation: presentationContract.readDrawingPresentation(presentation),
    projectionId,
    revision,
  });
}

function renderInspector(snapshot) {
  const visible = snapshot.controls !== null;
  inspectorForm.hidden = !visible;
  emptyInspector.hidden = visible;
  if (!visible) {
    selectedId.textContent = '';
    return;
  }
  selectedId.textContent = `${snapshot.controls.geometryTypeId} · ${snapshot.selectedDrawingId}`;
  const rectangle = snapshot.controls.geometryTypeId === 'geometry.rectangle';
  for (const id of ['startPrice', 'endPrice']) document.querySelector(`#${id}`).parentElement.hidden = rectangle;
  for (const id of ['lowPrice', 'highPrice', 'fillColor', 'fillOpacity']) {
    document.querySelector(`#${id}`).parentElement.hidden = !rectangle;
  }
  for (const input of inspectorForm.querySelectorAll('[data-field]')) {
    if (Object.hasOwn(snapshot.controls, input.dataset.field)) input.value = snapshot.controls[input.dataset.field];
  }
}

const inspector = createDrawingInspectorController({
  createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
  drawingPort: {
    async readDrawing({ drawingId }) {
      const brandedId = drawingIds.get(drawingId);
      const drawing = brandedId ? runtime.getDrawing(brandedId) : null;
      return drawing === null ? null : Object.freeze({
        documentRevision: runtime.getDocument().revision,
        drawing,
      });
    },
    async reviseDrawing({ documentRevision, drawingId, drawingRevision, geometry, presentation }) {
      const document = await runtime.reviseDrawing({
        drawingId: drawingIds.get(drawingId),
        expectedDocumentRevision: documentRevision,
        expectedDrawingRevision: drawingRevision,
        geometry,
        presentation,
        sessionId,
      });
      await synchronize(document);
      return document;
    },
  },
  geometryContract,
  onError(error) {
    host.dataset.lastError = `${error.code}:${error.message}`;
    status.textContent = `Error · ${error.code}`;
  },
  onStateChange(snapshot) {
    renderInspector(snapshot);
    host.dataset.inspectorStatus = snapshot.status;
    host.dataset.selectedDrawingId = snapshot.selectedDrawingId ?? '';
  },
  presentationContract,
  previewPort: inspectorPreviewPort,
  projectPreview: previewProjection,
});

const selectionSubscription = chartInteractionPort.subscribeSelection(({ hit }) => {
  void inspector.select(hit === null ? null : Object.freeze({
    drawingId: hit.entityId,
    projectionId: hit.projectionId,
  })).catch(() => {});
});

const rectangleController = createRectangleInteractionController({
  commandPort: {
    async createDrawing({ geometry }) { await createAcceptedDrawing('rectangle', geometry); },
  },
  createPreviewIdentity: (id) => createAnnotationPreviewIdentity(`preview.${id}`),
  geometryContract,
  interactionPort: chartInteractionPort,
  onError(error) {
    host.dataset.lastError = `${error.code}:${error.message}`;
    status.textContent = `Error · ${error.code}`;
  },
  onStateChange(snapshot) {
    host.dataset.controllerStatus = snapshot.status;
    armButton.setAttribute('aria-pressed', String(snapshot.status !== 'idle'));
    status.textContent = snapshot.status === 'idle'
      ? `${runtime.listDrawings().length} accepted · click to inspect`
      : `${snapshot.status} · place two points or right-click/Escape to cancel`;
  },
  previewPort: drawingPreviewPort,
  projectPreview({ geometry, interactionId, revision }) {
    return previewProjection({
      drawingId: `preview-entity.${interactionId}`,
      geometry,
      presentation: defaultPresentation,
      projectionId: `preview-projection.${interactionId}`,
      revision,
    });
  },
});

function armRectangle() {
  rectangleController.arm({ interactionId: `rectangle-${++interactionSequence}` });
}

async function updateField(field, value) {
  const current = inspector.snapshot();
  await inspector.updateDraft({
    expectedDraftRevision: current.draftRevision,
    field,
    value,
  });
}

armButton.addEventListener('click', () => {
  if (rectangleController.snapshot().status === 'idle') armRectangle();
  else void rectangleController.cancel('toolbar-toggle');
});
cancelToolButton.addEventListener('click', () => { void rectangleController.cancel('toolbar-cancel'); });
inspectorForm.addEventListener('change', (event) => {
  const field = event.target?.dataset?.field;
  if (!field) return;
  const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
  void updateField(field, value).catch(() => {});
});
document.querySelector('#cancel-edit').addEventListener('click', () => { void inspector.cancel(); });
document.querySelector('#save-edit').addEventListener('click', () => { void inspector.save(); });

function nativeOptionsRestored() {
  return JSON.stringify({
    crosshair: chart.options().crosshair,
    handleScale: chart.options().handleScale,
    handleScroll: chart.options().handleScroll,
  }) === initialNativeOptions;
}

function coloredPixels() {
  const canvas = chart.takeScreenshot(true);
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let blue = 0;
  let cyan = 0;
  let white = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 100 && pixels[index + 1] > 130 && pixels[index + 2] > 180) blue += 1;
    if (pixels[index] < 80 && pixels[index + 1] > 170 && pixels[index + 2] > 190) cyan += 1;
    if (pixels[index] > 220 && pixels[index + 1] > 220 && pixels[index + 2] > 220) white += 1;
  }
  return Object.freeze({ blue, cyan, white });
}

function seededSegmentClientPoint() {
  const ratio = 23 / 26;
  const startEpochMs = 1_700_001_800_000;
  const endEpochMs = 1_700_003_360_000;
  const epochMs = startEpochMs + ((endEpochMs - startEpochMs) * ratio);
  const price = 107 + ((116 - 107) * ratio);
  const rect = host.getBoundingClientRect();
  const x = chart.timeScale().timeToCoordinate(epochMs / 1_000);
  const y = series.priceToCoordinate(price);
  if (![x, y].every(Number.isFinite)) throw new Error('Seeded Segment is outside the visible chart.');
  return Object.freeze({ x: rect.left + x, y: rect.top + y });
}

globalThis.__annotationRectangleInspectorFixture = Object.freeze({
  armRectangle,
  coloredPixels,
  async dispose() {
    selectionSubscription.unsubscribe();
    await inspector.dispose();
    await rectangleController.dispose();
    chartInteractionPort.dispose();
    await inspectorPreviewPort.dispose();
    await drawingPreviewPort.dispose();
    await acceptedPort.dispose();
    await runtime.dispose();
    chart.remove();
  },
  save: () => inspector.save(),
  snapshot: () => Object.freeze({
    accepted: acceptedPort.snapshot(),
    afterData: JSON.stringify(series.data()),
    beforeData,
    controller: rectangleController.snapshot(),
    document: runtime.getDocument(),
    inspector: inspector.snapshot(),
    inspectorPreview: inspectorPreviewPort.snapshot(),
    interaction: chartInteractionPort.snapshot(),
    nativeOptionsRestored: nativeOptionsRestored(),
    preview: drawingPreviewPort.snapshot(),
    visibleLogicalRange: chart.timeScale().getVisibleLogicalRange(),
  }),
  seededSegmentClientPoint,
  updateField,
});

status.textContent = '1 accepted · draw a Rectangle or click the Segment';
host.dataset.controllerStatus = 'idle';
host.dataset.inspectorStatus = 'idle';
host.dataset.scenario = 'ready';
