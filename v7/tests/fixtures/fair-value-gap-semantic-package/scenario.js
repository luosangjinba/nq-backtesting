import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as evidenceContract from '../../../src/annotation-evidence-resolver/public.js';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationProjection,
  createChartAnnotationProjectionPort,
  createLightweightSeriesPrimitiveAdapter,
  createRectangleRenderPrimitive,
  createSegmentRenderPrimitive,
  readAnnotationProjection,
} from '../../../src/annotation-chart-projection/public.js';
import {
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  createMultiPaneAnnotationProjectionRuntime,
} from '../../../src/annotation-context-projection/public.js';
import { createAnnotationRuntime } from '../../../src/annotation-runtime/public.js';
import { createSemanticPackageRegistry } from '../../../src/annotation-semantic-registry/public.js';
import {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
  FAIR_VALUE_GAP_TYPE_ID,
} from '../../../src/semantic-fair-value-gap/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const body = document.body;
const sessionId = createSessionId('session.r13-10c-fixture');
const buttons = Object.freeze(Object.fromEntries([
  'after', 'before', 'construct-bearish', 'construct-bullish', 'disable', 'enable',
].map((id) => [id, document.getElementById(id)])));
const status = document.getElementById('status');
const count = document.getElementById('projection-count');
let mode = 'after';
let reconciliationRevision = 0;

function marketBars() {
  const values = Array.from({ length: 16 }, (_, index) => {
    const open = 100 + (index * 0.6);
    const close = open + (index % 2 === 0 ? 0.4 : -0.3);
    return { close, high: Math.max(open, close) + 0.7, low: Math.min(open, close) - 0.7, open, volume: 10 + index };
  });
  values[4] = { close: 100.5, high: 101, low: 99, open: 100, volume: 20 };
  values[5] = { close: 104, high: 105, low: 100, open: 100.5, volume: 28 };
  values[6] = { close: 105, high: 106, low: 103, open: 104, volume: 24 };
  values[10] = { close: 111, high: 113, low: 110, open: 112, volume: 20 };
  values[11] = { close: 107, high: 112, low: 106, open: 111, volume: 28 };
  values[12] = { close: 106, high: 108, low: 105, open: 107, volume: 24 };
  return Object.freeze(values.map((value, index) => Object.freeze({
    ...value,
    endEpochMs: BASE + ((index + 1) * MINUTE),
    startEpochMs: BASE + (index * MINUTE),
  })));
}

const acceptedBars = marketBars();
const replayCutoffAfter = BASE + (16 * MINUTE);
const replayCutoffBefore = BASE + (15 * MINUTE);
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
series.setData(acceptedBars.map((bar) => ({
  close: bar.close,
  high: bar.high,
  low: bar.low,
  open: bar.open,
  time: bar.startEpochMs / 1_000,
})));
const initialCandleBytes = JSON.stringify(series.data());
const primitiveAdapter = createLightweightSeriesPrimitiveAdapter({
  createPrimitive(candidate) {
    const projection = readAnnotationProjection(candidate);
    if (projection.geometry.typeId === 'geometry.rectangle') {
      return createRectangleRenderPrimitive(candidate);
    }
    if (projection.geometry.typeId === 'geometry.segment') {
      return createSegmentRenderPrimitive(candidate);
    }
    throw new Error(`Fixture has no renderer for ${projection.geometry.typeId}`);
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
  availableCapabilities: [
    'annotation.evidence.bundle',
    'annotation.geometry.rectangle',
    'annotation.geometry.segment',
  ],
  packages: [createFairValueGapSemanticPackage({ evidenceContract, geometryContract })],
});
await semanticRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);

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

function evidence(selectedIndex) {
  const snapshot = evidenceContract.createAcceptedAnnotationEvidenceSnapshot({
    acceptedWorkspaceRevision: 31,
    artifacts: [],
    bars: acceptedBars,
    datasetRevision: 'dataset.r13-10c-fixture',
    displayTimeframeId: 'timeframe.1m',
    instrumentId: 'instrument.nq',
    paneId: 'pane.nq-1m',
    replayCutoffEpochMs: replayCutoffAfter,
    schemaVersion: 1,
    sessionId,
    sourceTimeframeId: 'timeframe.1m',
  });
  return evidenceContract.resolveAnnotationEvidence({
    requirement: evidenceContract.createAnnotationEvidenceRequirement({
      followingBars: 1,
      maximumArtifactReferences: 0,
      precedingBars: 1,
      schemaVersion: 1,
    }),
    selection: evidenceContract.createAnnotationEvidenceSelection({
      artifactReferences: [],
      barStartEpochMs: acceptedBars[selectedIndex].startEpochMs,
      schemaVersion: 1,
    }),
    snapshot,
  });
}

function currentReplayCutoff() {
  return mode === 'after' ? replayCutoffAfter : replayCutoffBefore;
}

function frame() {
  reconciliationRevision += 1;
  return createAnnotationProjectionFrame({
    annotationRevision: annotationRuntime.getDocument().revision,
    panes: [{
      acceptedBuckets: acceptedBars.map(({ endEpochMs, startEpochMs }) => ({
        displayEpochMs: startEpochMs,
        endEpochMs,
        startEpochMs,
      })),
      instrumentId: 'instrument.nq',
      paneId: 'pane.nq-1m',
      timeframeId: 'timeframe.1m',
    }],
    reconciliationRevision,
    replayCutoffEpochMs: currentReplayCutoff(),
    sessionId,
  });
}

function subjects() {
  return Object.freeze(annotationRuntime.listSemanticArtifacts()
    .flatMap((artifact) => semanticRegistry.projectionInputsForArtifact(artifact))
    .map(createAnnotationProjectionSubject));
}

const paintFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

async function reconcile(label) {
  await projectionRuntime.reconcile({
    frame: frame(),
    subjects: subjects(),
    surfaces: [{ paneId: 'pane.nq-1m', port: chartPort }],
  });
  count.textContent = `${chartPort.snapshot().projectionCount} projections`;
  buttons.before.dataset.active = String(mode === 'before');
  buttons.after.dataset.active = String(mode === 'after');
  status.textContent = `${label} · document rev ${annotationRuntime.getDocument().revision}`;
  await paintFrame();
  return chartPort.snapshot().projectionCount;
}

async function construct(direction) {
  const selectedIndex = direction === 'bullish' ? 5 : 11;
  const artifactId = `artifact.fixture-${direction}-fvg`;
  const draft = semanticRegistry.constructArtifactDraft({
    artifactId,
    construction: {
      createdAtEpochMs: BASE + (17 * MINUTE),
      evidence: evidence(selectedIndex),
      mode: 'evidence-derived',
      sessionId,
    },
    typeId: FAIR_VALUE_GAP_TYPE_ID,
    typeVersion: '1.0.0',
  });
  await annotationRuntime.createSemanticArtifact({
    draft,
    expectedDocumentRevision: annotationRuntime.getDocument().revision,
    sessionId,
  });
  buttons[`construct-${direction}`].disabled = true;
  return reconcile(`${direction} FVG constructed`);
}

async function disablePackage() {
  await semanticRegistry.disablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  buttons.disable.disabled = true;
  buttons.enable.disabled = false;
  return reconcile('Package disabled · Artifacts preserved');
}

async function enablePackage() {
  await semanticRegistry.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
  buttons.disable.disabled = false;
  buttons.enable.disabled = true;
  return reconcile('Package enabled · projections restored');
}

function colorPixels([red, green, blue]) {
  const canvas = chart.takeScreenshot();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let matching = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (Math.abs(pixels[index] - red) < 20
      && Math.abs(pixels[index + 1] - green) < 20
      && Math.abs(pixels[index + 2] - blue) < 20) matching += 1;
  }
  return matching;
}

function fail(error) {
  body.dataset.error = `${error.code ?? error.name}:${error.message}`;
  body.dataset.scenario = 'failed';
  status.textContent = body.dataset.error;
  throw error;
}

function guarded(action) { return () => action().catch(fail); }

buttons['construct-bullish'].addEventListener('click', guarded(() => construct('bullish')));
buttons['construct-bearish'].addEventListener('click', guarded(() => construct('bearish')));
buttons.before.addEventListener('click', guarded(async () => { mode = 'before'; return reconcile('Before observed'); }));
buttons.after.addEventListener('click', guarded(async () => { mode = 'after'; return reconcile('After observed'); }));
buttons.disable.addEventListener('click', guarded(disablePackage));
buttons.enable.addEventListener('click', guarded(enablePackage));

try {
  chart.timeScale().fitContent();
  await reconcile('Ready for exact evidence construction');
  globalThis.__fairValueGapFixture = Object.freeze({
    after: async () => { mode = 'after'; return reconcile('After observed'); },
    before: async () => { mode = 'before'; return reconcile('Before observed'); },
    candleBytes: () => JSON.stringify(series.data()),
    colorPixels,
    constructBearish: () => construct('bearish'),
    constructBullish: () => construct('bullish'),
    disablePackage,
    document: () => annotationRuntime.getDocument(),
    enablePackage,
    initialCandleBytes,
    logicalRange: () => chart.timeScale().getVisibleLogicalRange(),
    packageSnapshot: () => semanticRegistry.packageSnapshot(FAIR_VALUE_GAP_PACKAGE_ID),
    projectionCount: () => chartPort.snapshot().projectionCount,
  });
  globalThis.__disposeFairValueGapFixture = async () => {
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
