import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationProjection,
  createChartAnnotationProjectionPort,
  createLightweightSeriesPrimitiveAdapter,
  createSegmentRenderPrimitive,
  readAnnotationProjection,
} from '../../../src/annotation-chart-projection/public.js';
import {
  ANCHOR_PROJECTION_POLICIES,
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  createMultiPaneAnnotationProjectionRuntime,
} from '../../../src/annotation-context-projection/public.js';
import {
  createAnnotationRuntime,
  createDrawingPresentation,
  createDrawingId,
  createDrawingProvenance,
} from '../../../src/annotation-runtime/public.js';
import { createSemanticPackageRegistry } from '../../../src/annotation-semantic-registry/public.js';
import { createLiquidityLevelSemanticPackage } from '../../../src/semantic-liquidity-level/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const PACKAGE_ID = 'first-party.liquidity-level';
const body = document.body;
const sessionId = createSessionId('session.r13-9-fixture');
const drawingId = createDrawingId('drawing.liquidity-candidate');
const buttons = Object.freeze(Object.fromEntries([
  'after', 'before', 'disable', 'enable', 'promote-bsl', 'promote-ssl',
].map((id) => [id, document.getElementById(id)])));
const status = document.getElementById('status');
const count = document.getElementById('projection-count');
const inspector = document.getElementById('inspector');
const resolution = document.getElementById('resolution');
let mode = 'after';
let reconciliationRevision = 0;

function replayCutoffEpochMs() {
  return mode === 'after' ? BASE + (14 * MINUTE) : BASE + (6 * MINUTE);
}

function bars() {
  return Object.freeze(Array.from({ length: 18 }, (_, index) => {
    const wave = Math.sin(index / 1.8) * 2.4;
    const open = 100 + (index * 0.42) + wave;
    const close = open + (index % 3 === 0 ? 1.2 : -0.55);
    return Object.freeze({
      close, high: Math.max(open, close) + 1.2, low: Math.min(open, close) - 1.1,
      open, time: (BASE + (index * MINUTE)) / 1_000,
    });
  }));
}

const chart = createChart(document.getElementById('chart'), {
  autoSize: true,
  grid: { horzLines: { color: '#14202a' }, vertLines: { color: '#14202a' } },
  layout: { background: { color: '#05070a' }, textColor: '#8fa3b7' },
  rightPriceScale: { autoScale: true, borderColor: '#243544' },
  timeScale: { borderColor: '#243544', timeVisible: true },
});
const series = chart.addSeries(CandlestickSeries, {
  downColor: '#f23645', borderVisible: false, upColor: '#089981',
  wickDownColor: '#f23645', wickUpColor: '#089981',
});
series.setData(bars());
const initialCandleBytes = JSON.stringify(series.data());
const primitiveAdapter = createLightweightSeriesPrimitiveAdapter({
  createPrimitive(candidate) {
    const projection = readAnnotationProjection(candidate);
    if (projection.geometry.typeId !== 'geometry.segment') {
      throw new Error(`Fixture has no renderer for ${projection.geometry.typeId}`);
    }
    return createSegmentRenderPrimitive(candidate);
  },
  series,
});
const chartPort = createChartAnnotationProjectionPort({ primitiveAdapter });
const projectionRuntime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection,
  geometryContract,
  policyRegistry: createInitialAnchorProjectionPolicyRegistry(),
});
const semanticRegistry = createSemanticPackageRegistry({
  availableCapabilities: ['annotation.geometry.segment'],
  packages: [createLiquidityLevelSemanticPackage({ geometryContract })],
});
await semanticRegistry.enablePackage(PACKAGE_ID);

function fakeRepository() {
  return Object.freeze({
    prepare() {
      let phase = 'prepared';
      return Object.freeze({
        apply: async () => { phase = 'applied'; },
        finalize: async () => { phase = 'finalized'; },
        rollback: async () => { phase = 'rolled-back'; },
        snapshot: () => Object.freeze({ phase }),
      });
    },
  });
}

const annotationRuntime = createAnnotationRuntime({
  geometryContract,
  repository: fakeRepository(),
  semanticContract: semanticRegistry,
  sessionId,
});

function anchor(offset, price) {
  return geometryContract.createMarketAnchor({
    epochMs: BASE + (offset * MINUTE), instrumentId: 'instrument.nq', price,
  });
}

await annotationRuntime.createDrawing({
  drawingId,
  expectedDocumentRevision: 0,
  geometry: geometryContract.createSegmentGeometry({
    endAnchor: anchor(10, 108), startAnchor: anchor(2, 108),
  }),
  presentation: createDrawingPresentation({
    fillColor: '#22d3ee',
    fillOpacity: 0.18,
    schemaVersion: 1,
    strokeColor: '#22d3ee',
    strokeWidth: 2,
  }),
  provenance: createDrawingProvenance({
    createdAtEpochMs: BASE + (13 * MINUTE),
    observedAtReplayCutoffEpochMs: BASE + (12 * MINUTE),
    origin: 'manual',
  }),
  sessionId,
});

function frame() {
  reconciliationRevision += 1;
  return createAnnotationProjectionFrame({
    annotationRevision: annotationRuntime.getDocument().revision,
    panes: [{
      acceptedBuckets: Array.from({ length: 18 }, (_, index) => ({
        endEpochMs: BASE + ((index + 1) * MINUTE),
        startEpochMs: BASE + (index * MINUTE),
      })),
      instrumentId: 'instrument.nq', paneId: 'pane.nq-1m', timeframeId: 'timeframe.1m',
    }],
    reconciliationRevision,
    replayCutoffEpochMs: replayCutoffEpochMs(),
    sessionId,
  });
}

function drawingSubject(drawing) {
  return createAnnotationProjectionSubject({
    entityId: drawing.drawingId,
    geometry: drawing.geometry,
    observedAtReplayCutoffEpochMs: drawing.provenance.observedAtReplayCutoffEpochMs,
    policy: { policyId: ANCHOR_PROJECTION_POLICIES.exactInstant, version: '1.0.0' },
    presentation: drawing.presentation,
    projectionId: `drawing:${drawing.drawingId}`,
    revision: drawing.revision,
    sourceBars: [],
  });
}

function subjects() {
  const drawings = annotationRuntime.listDrawings()
    .filter(({ status: state }) => state === 'active').map(drawingSubject);
  const artifacts = annotationRuntime.listSemanticArtifacts()
    .flatMap((artifact) => semanticRegistry.projectionInputsForArtifact(artifact))
    .map(createAnnotationProjectionSubject);
  return Object.freeze([...drawings, ...artifacts]);
}

function displayValue(value) {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function renderInspector() {
  const artifact = annotationRuntime.listSemanticArtifacts()[0] ?? null;
  inspector.replaceChildren();
  if (artifact === null) {
    resolution.dataset.state = 'none';
    resolution.textContent = 'Select Promote to BSL or Promote to SSL';
    return;
  }
  const view = semanticRegistry.inspectArtifactAtReplayCutoff(
    artifact,
    replayCutoffEpochMs(),
  );
  if (view.visibility.status === 'hidden-before-observation') {
    resolution.dataset.state = 'hidden';
    resolution.textContent = 'Not visible before observation cutoff';
    return;
  }
  resolution.dataset.state = view.resolution.status;
  resolution.textContent = view.resolution.status === 'resolved'
    ? `Resolved · ${view.resolution.packageId}@${view.resolution.packageVersion}`
    : `Unresolved · package ${view.resolution.packageState}`;
  for (const group of view.groups) {
    const section = document.createElement('section');
    section.className = 'group';
    const heading = document.createElement('h3');
    heading.textContent = group.label;
    const list = document.createElement('dl');
    for (const item of group.fields) {
      const term = document.createElement('dt');
      term.textContent = item.label;
      const detail = document.createElement('dd');
      detail.textContent = displayValue(item.value);
      detail.title = detail.textContent;
      list.append(term, detail);
    }
    section.append(heading, list);
    inspector.append(section);
  }
}

const paintFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function colorPixels([red, green, blue]) {
  const canvas = chart.takeScreenshot();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let matching = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (Math.abs(pixels[index] - red) < 18
      && Math.abs(pixels[index + 1] - green) < 18
      && Math.abs(pixels[index + 2] - blue) < 18) matching += 1;
  }
  return matching;
}

async function reconcile(label) {
  const currentSubjects = subjects();
  await projectionRuntime.reconcile({
    frame: frame(),
    subjects: currentSubjects,
    surfaces: [{ paneId: 'pane.nq-1m', port: chartPort }],
  });
  count.textContent = `${chartPort.snapshot().projectionCount} projections`;
  buttons.before.dataset.active = String(mode === 'before');
  buttons.after.dataset.active = String(mode === 'after');
  renderInspector();
  status.textContent = `${label} · document rev ${annotationRuntime.getDocument().revision}`;
  await paintFrame();
  return chartPort.snapshot().projectionCount;
}

async function promote(typeId) {
  const drawing = annotationRuntime.getDrawing(drawingId);
  const artifactId = typeId === 'liquidity.bsl' ? 'artifact.fixture-bsl' : 'artifact.fixture-ssl';
  const draft = semanticRegistry.constructArtifactDraft({
    artifactId,
    construction: {
      context: {
        createdAtEpochMs: BASE + (13 * MINUTE),
        instrumentId: 'instrument.nq',
        observedAtReplayCutoffEpochMs: BASE + (12 * MINUTE),
        sourceTimeframeId: 'timeframe.1m',
      },
      drawing,
      mode: 'drawing-promotion',
    },
    typeId,
    typeVersion: '1.0.0',
  });
  await annotationRuntime.promoteDrawing({
    draft,
    drawingDisposition: 'archive',
    drawingId,
    expectedDocumentRevision: annotationRuntime.getDocument().revision,
    expectedDrawingRevision: drawing.revision,
    sessionId,
  });
  buttons['promote-bsl'].disabled = true;
  buttons['promote-ssl'].disabled = true;
  return reconcile(typeId === 'liquidity.bsl' ? 'BSL promoted' : 'SSL promoted');
}

async function disablePackage() {
  await semanticRegistry.disablePackage(PACKAGE_ID);
  buttons.disable.disabled = true;
  buttons.enable.disabled = false;
  return reconcile('Package disabled · Artifact preserved');
}

async function enablePackage() {
  await semanticRegistry.enablePackage(PACKAGE_ID);
  buttons.disable.disabled = false;
  buttons.enable.disabled = true;
  return reconcile('Package enabled · projection restored');
}

function guarded(action) {
  return () => action().catch(fail);
}

buttons['promote-bsl'].addEventListener('click', guarded(() => promote('liquidity.bsl')));
buttons['promote-ssl'].addEventListener('click', guarded(() => promote('liquidity.ssl')));
buttons.before.addEventListener('click', guarded(async () => { mode = 'before'; return reconcile('Before observed'); }));
buttons.after.addEventListener('click', guarded(async () => { mode = 'after'; return reconcile('After observed'); }));
buttons.disable.addEventListener('click', guarded(disablePackage));
buttons.enable.addEventListener('click', guarded(enablePackage));

function fail(error) {
  body.dataset.error = `${error.code ?? error.name}:${error.message}`;
  body.dataset.scenario = 'failed';
  status.textContent = body.dataset.error;
  throw error;
}

try {
  chart.timeScale().fitContent();
  await reconcile('Generic Drawing ready');
  globalThis.__annotationSemanticPackageFixture = Object.freeze({
    after: async () => { mode = 'after'; return reconcile('After observed'); },
    before: async () => { mode = 'before'; return reconcile('Before observed'); },
    candleBytes: () => JSON.stringify(series.data()),
    colorPixels,
    disablePackage,
    document: () => annotationRuntime.getDocument(),
    enablePackage,
    initialCandleBytes,
    inspect: () => annotationRuntime.listSemanticArtifacts()[0]
      ? semanticRegistry.inspectArtifactAtReplayCutoff(
        annotationRuntime.listSemanticArtifacts()[0],
        replayCutoffEpochMs(),
      ) : null,
    packageSnapshot: () => semanticRegistry.packageSnapshot(PACKAGE_ID),
    promoteBsl: () => promote('liquidity.bsl'),
    promoteSsl: () => promote('liquidity.ssl'),
    projectionCount: () => chartPort.snapshot().projectionCount,
  });
  globalThis.__disposeAnnotationSemanticPackageFixture = async () => {
    await annotationRuntime.dispose();
    await semanticRegistry.dispose();
    await projectionRuntime.dispose();
    await chartPort.dispose();
    chart.remove();
  };
  body.dataset.scenario = 'ready';
} catch (error) {
  fail(error);
}
