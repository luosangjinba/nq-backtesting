import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
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
  ANCHOR_PROJECTION_POLICIES,
  createAnnotationProjectionFrame,
  createAnnotationProjectionSubject,
  createInitialAnchorProjectionPolicyRegistry,
  createMultiPaneAnnotationProjectionRuntime,
  readAnnotationProjectionSubject,
} from '../../../src/annotation-context-projection/public.js';
import { createSessionId } from '../../../src/session-identity/public.js';

const BASE = Date.UTC(2023, 10, 14, 14, 0);
const MINUTE = 60_000;
const body = document.body;
const status = document.querySelector('#status');
const beforeButton = document.querySelector('#before');
const afterButton = document.querySelector('#after');
const sessionId = createSessionId('session.r13-8-fixture');
let reconciliationRevision = 0;

function bars(stepMinutes, count) {
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 2) * 3;
    const open = 100 + (index * stepMinutes * 0.35) + wave;
    const close = open + (index % 2 === 0 ? 1.4 : -0.8);
    return Object.freeze({
      close, high: Math.max(open, close) + 1.4, low: Math.min(open, close) - 1.3,
      open, time: (BASE + (index * stepMinutes * MINUTE)) / 1_000,
    });
  }));
}

function buckets(stepMinutes, count) {
  const duration = stepMinutes * MINUTE;
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    endEpochMs: BASE + ((index + 1) * duration),
    startEpochMs: BASE + (index * duration),
  })));
}

function chartSurface(host, data) {
  const chart = createChart(host, {
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
  series.setData(data);
  const adapter = createLightweightSeriesPrimitiveAdapter({
    createPrimitive(candidate) {
      const projection = readAnnotationProjection(candidate);
      if (projection.geometry.typeId === 'geometry.segment') {
        return createSegmentRenderPrimitive(candidate);
      }
      if (projection.geometry.typeId === 'geometry.rectangle') {
        return createRectangleRenderPrimitive(candidate);
      }
      throw new Error(`Fixture has no renderer for ${projection.geometry.typeId}`);
    },
    series,
  });
  const port = createChartAnnotationProjectionPort({ primitiveAdapter: adapter });
  chart.timeScale().fitContent();
  return Object.freeze({ chart, port, series });
}

const oneMinute = chartSurface(document.querySelector('#chart-1m'), bars(1, 12));
const fiveMinute = chartSurface(document.querySelector('#chart-5m'), bars(5, 3));
const beforeData = JSON.stringify([
  oneMinute.series.data(), fiveMinute.series.data(),
]);

function anchor(offsetMinutes, price) {
  return geometryContract.createMarketAnchor({
    epochMs: BASE + (offsetMinutes * MINUTE), instrumentId: 'instrument.nq', price,
  });
}

function style(strokeColor, fillOpacity) {
  return Object.freeze({
    fillColor: strokeColor, fillOpacity, schemaVersion: 1, strokeColor, strokeWidth: 4,
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

const subjects = Object.freeze([
  createAnnotationProjectionSubject({
    entityId: 'drawing.segment-exact',
    geometry: geometryContract.readDrawingGeometry(geometryContract.createSegmentGeometry({
      endAnchor: anchor(4, 111), startAnchor: anchor(1, 101),
    })),
    observedAtReplayCutoffEpochMs: BASE + (2 * MINUTE),
    policy: { policyId: ANCHOR_PROJECTION_POLICIES.exactInstant, version: '1.0.0' },
    presentation: style('#22d3ee', 0),
    projectionId: 'projection.segment-exact',
    revision: 3,
    sourceBars: [],
  }),
  createAnnotationProjectionSubject({
    entityId: 'drawing.rectangle-containing',
    geometry: geometryContract.readDrawingGeometry(geometryContract.createRectangleGeometry({
      firstAnchor: anchor(2, 99), secondAnchor: anchor(9, 112),
    })),
    observedAtReplayCutoffEpochMs: BASE + (2 * MINUTE),
    policy: {
      policyId: ANCHOR_PROJECTION_POLICIES.acceptedContainingBucket, version: '1.0.0',
    },
    presentation: style('#f59e0b', 0.2),
    projectionId: 'projection.rectangle-containing',
    revision: 3,
    sourceBars: [sourceBar(2), sourceBar(9)],
  }),
]);
const beforeGeometry = JSON.stringify(subjects.map(readAnnotationProjectionSubject));
const runtime = createMultiPaneAnnotationProjectionRuntime({
  createProjection: createAnnotationProjection,
  geometryContract,
  policyRegistry: createInitialAnchorProjectionPolicyRegistry(),
});
const surfaces = Object.freeze([
  { paneId: 'pane.nq-1m', port: oneMinute.port },
  { paneId: 'pane.nq-5m', port: fiveMinute.port },
]);

function projectionFrame(mode) {
  reconciliationRevision += 1;
  return createAnnotationProjectionFrame({
    annotationRevision: 7,
    panes: [
      {
        acceptedBuckets: buckets(1, 12), instrumentId: 'instrument.nq',
        paneId: 'pane.nq-1m', timeframeId: 'timeframe.1m',
      },
      {
        acceptedBuckets: buckets(5, 3), instrumentId: 'instrument.nq',
        paneId: 'pane.nq-5m', timeframeId: 'timeframe.5m',
      },
    ],
    reconciliationRevision,
    replayCutoffEpochMs: mode === 'after' ? BASE + (10 * MINUTE) : BASE + MINUTE,
    sessionId,
  });
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function counts() {
  return [oneMinute.port.snapshot().projectionCount, fiveMinute.port.snapshot().projectionCount];
}

function updateUi(mode) {
  const current = counts();
  beforeButton.dataset.active = String(mode === 'before');
  afterButton.dataset.active = String(mode === 'after');
  document.querySelector('#count-1m').textContent = `${current[0]} projections`;
  document.querySelector('#count-5m').textContent = `${current[1]} projections`;
  status.textContent = mode === 'after'
    ? `After observed · same Annotation rev 7 · reconcile ${reconciliationRevision}`
    : `Before observed · no future evidence · reconcile ${reconciliationRevision}`;
}

async function show(mode) {
  beforeButton.disabled = true;
  afterButton.disabled = true;
  try {
    await runtime.reconcile({ frame: projectionFrame(mode), subjects, surfaces });
    updateUi(mode);
    await frame();
    return counts();
  } finally {
    beforeButton.disabled = false;
    afterButton.disabled = false;
  }
}

function colorPixels(chart, [red, green, blue]) {
  const canvas = chart.takeScreenshot();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (Math.abs(pixels[index] - red) < 18
      && Math.abs(pixels[index + 1] - green) < 18
      && Math.abs(pixels[index + 2] - blue) < 18) count += 1;
  }
  return count;
}

beforeButton.addEventListener('click', () => show('before').catch(fail));
afterButton.addEventListener('click', () => show('after').catch(fail));

function fail(error) {
  body.dataset.error = `${error.code ?? error.name}:${error.message}`;
  body.dataset.scenario = 'failed';
  status.textContent = body.dataset.error;
  throw error;
}

try {
  const beforeCounts = await show('before');
  const afterCounts = await show('after');
  const oneMinuteCyanPixels = colorPixels(oneMinute.chart, [34, 211, 238]);
  const oneMinuteAmberPixels = colorPixels(oneMinute.chart, [245, 158, 11]);
  const fiveMinuteCyanPixels = colorPixels(fiveMinute.chart, [34, 211, 238]);
  const fiveMinuteAmberPixels = colorPixels(fiveMinute.chart, [245, 158, 11]);
  const returnCounts = await show('before');
  await show('after');
  globalThis.__annotationContextProjectionResult = Object.freeze({
    afterData: JSON.stringify([oneMinute.series.data(), fiveMinute.series.data()]),
    afterGeometry: JSON.stringify(subjects.map(readAnnotationProjectionSubject)),
    afterCounts,
    beforeCounts,
    beforeData,
    beforeGeometry,
    fiveMinuteAmberPixels,
    fiveMinuteCyanPixels,
    oneMinuteAmberPixels,
    oneMinuteCyanPixels,
    returnCounts,
  });
  globalThis.__setAnnotationContextProjectionMode = show;
  globalThis.__disposeAnnotationContextProjectionFixture = async () => {
    await runtime.dispose();
    await oneMinute.port.dispose();
    await fiveMinute.port.dispose();
    oneMinute.chart.remove();
    fiveMinute.chart.remove();
  };
  body.dataset.scenario = 'ready';
} catch (error) {
  fail(error);
}
