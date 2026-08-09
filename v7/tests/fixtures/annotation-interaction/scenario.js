import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createChartAnnotationProjectionPort,
  createLightweightAnnotationInteractionPort,
  createLightweightSeriesPrimitiveAdapter,
  createSegmentRenderPrimitive,
} from '../../../src/annotation-chart-projection/public.js';
import { createSegmentInteractionController } from '../../../src/annotation-interaction/public.js';

const host = document.querySelector('#chart');
const armButton = document.querySelector('#arm');
const cancelButton = document.querySelector('#cancel');
const status = document.querySelector('#status');
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

function primitiveAdapter(color) {
  return createLightweightSeriesPrimitiveAdapter({
    createPrimitive: (projection) => createSegmentRenderPrimitive(projection, {
      color,
      lineWidth: 4,
    }),
    series,
  });
}

const previewPort = createChartAnnotationPreviewPort({ primitiveAdapter: primitiveAdapter('#22d3ee') });
const acceptedPort = createChartAnnotationProjectionPort({ primitiveAdapter: primitiveAdapter('#a3e635') });
const chartInteractionPort = createLightweightAnnotationInteractionPort({
  chart,
  host,
  paneId: 'pane-main',
  resolveInstrumentId: () => 'instrument.nq',
  resolveMarketEpochMs: ({ displayEpochMs }) => displayEpochMs,
  series,
});
const acceptedProjections = [];
let annotationRevision = 0;
let fixtureCommitCount = 0;
let interactionSequence = 0;

function projection({ entityId, geometry, projectionId, revision }) {
  return createAnnotationProjection({
    entityId,
    geometry: geometryContract.readDrawingGeometry(geometry),
    projectionId,
    revision,
  });
}

const controller = createSegmentInteractionController({
  commandPort: {
    async createDrawing({ geometry }) {
      fixtureCommitCount += 1;
      const suffix = String(fixtureCommitCount);
      acceptedProjections.push(projection({
        entityId: `drawing.segment-${suffix}`,
        geometry,
        projectionId: `projection.segment-${suffix}`,
        revision: 1,
      }));
      const prepared = acceptedPort.prepare(++annotationRevision, [...acceptedProjections]);
      const receipt = await acceptedPort.apply(prepared);
      await acceptedPort.finalize(prepared, receipt);
      return Object.freeze({ annotationRevision, drawingId: `drawing.segment-${suffix}` });
    },
  },
  createPreviewIdentity: (interactionId) => createAnnotationPreviewIdentity(`preview.${interactionId}`),
  geometryContract,
  interactionPort: chartInteractionPort,
  onError(error) {
    host.dataset.lastError = `${error.code}:${error.message}`;
    status.textContent = `Error · ${error.code}`;
  },
  onStateChange(snapshot) {
    host.dataset.controllerStatus = snapshot.status;
    host.dataset.commitCount = String(snapshot.acceptedCommitCount);
    armButton.setAttribute('aria-pressed', String(snapshot.status !== 'idle'));
    status.textContent = snapshot.status === 'idle'
      ? `Idle · ${snapshot.acceptedCommitCount} accepted`
      : `${snapshot.status} · drag on the chart or press Escape`;
  },
  previewPort,
  projectPreview({ geometry, interactionId, revision }) {
    return projection({
      entityId: `preview-entity.${interactionId}`,
      geometry,
      projectionId: `preview-projection.${interactionId}`,
      revision,
    });
  },
});

function arm() {
  controller.arm({ interactionId: `segment-${++interactionSequence}` });
}

armButton.addEventListener('click', () => {
  if (controller.snapshot().status === 'idle') arm();
  else void controller.cancel('toolbar-toggle');
});
cancelButton.addEventListener('click', () => { void controller.cancel('toolbar-cancel'); });

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
  let cyan = 0;
  let lime = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 80 && pixels[index + 1] > 160 && pixels[index + 2] > 180) cyan += 1;
    if (pixels[index] > 110 && pixels[index + 1] > 160 && pixels[index + 2] < 100) lime += 1;
  }
  return Object.freeze({ cyan, lime });
}

globalThis.__annotationInteractionFixture = Object.freeze({
  arm,
  cancel: (reason = 'fixture-cancel') => controller.cancel(reason),
  coloredPixels,
  async dispose() {
    await controller.dispose();
    chartInteractionPort.dispose();
    await previewPort.dispose();
    await acceptedPort.dispose();
    globalThis.__annotationInteractionDisposed = Object.freeze({
      accepted: acceptedPort.snapshot(),
      controller: controller.snapshot(),
      interaction: chartInteractionPort.snapshot(),
      preview: previewPort.snapshot(),
    });
    chart.remove();
  },
  settle: () => controller.settle(),
  snapshot: () => Object.freeze({
    accepted: acceptedPort.snapshot(),
    afterData: JSON.stringify(series.data()),
    beforeData,
    controller: controller.snapshot(),
    fixtureCommitCount,
    interaction: chartInteractionPort.snapshot(),
    nativeOptionsRestored: nativeOptionsRestored(),
    preview: previewPort.snapshot(),
    visibleLogicalRange: chart.timeScale().getVisibleLogicalRange(),
  }),
});

status.textContent = 'Idle · 0 accepted';
host.dataset.controllerStatus = 'idle';
host.dataset.commitCount = '0';
host.dataset.scenario = 'ready';
