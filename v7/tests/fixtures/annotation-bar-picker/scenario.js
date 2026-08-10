import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import * as geometryContract from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationPreviewIdentity,
  createAnnotationProjection,
  createChartAnnotationPreviewPort,
  createLightweightAnnotationInteractionPort,
  createLightweightSeriesPrimitiveAdapter,
  createRectangleRenderPrimitive,
} from '../../../src/annotation-chart-projection/public.js';
import {
  createExactAnnotationBarPickerController,
} from '../../../src/annotation-bar-picker/public.js';

const MINUTE_SECONDS = 60;
const instrumentId = 'instrument.nq';
const host = document.querySelector('#chart');
const armButton = document.querySelector('#arm');
const cancelButton = document.querySelector('#cancel');
const status = document.querySelector('#status');
const chart = createChart(host, {
  autoSize: true,
  layout: { background: { color: '#05070a' }, textColor: '#a8b1bd' },
  rightPriceScale: { autoScale: true },
});
const series = chart.addSeries(CandlestickSeries, {
  downColor: '#f23645', borderVisible: false, upColor: '#089981',
  wickDownColor: '#f23645', wickUpColor: '#089981',
});
const bars = Object.freeze(Array.from({ length: 90 }, (_, index) => {
  const center = 100 + (index * 0.24) + (Math.sin(index / 4) * 1.8);
  const open = center + (index % 3 === 0 ? -0.6 : 0.35);
  const close = center + (index % 3 === 0 ? 0.75 : -0.25);
  return Object.freeze({
    close,
    high: Math.max(open, close) + 1.2,
    low: Math.min(open, close) - 1.1,
    open,
    time: 1_700_000_000 + (index * MINUTE_SECONDS),
  });
}));
const barsByEpochMs = new Map(bars.map((bar) => [bar.time * 1_000, bar]));
series.setData(bars);
chart.timeScale().setVisibleLogicalRange({ from: 12, to: 70 });
const beforeData = JSON.stringify(series.data());
const initialNativeOptions = JSON.stringify({
  handleScale: chart.options().handleScale,
  handleScroll: chart.options().handleScroll,
});

const highlightIdentity = createAnnotationPreviewIdentity('preview.exact-bar-picker');
const highlightPort = createChartAnnotationPreviewPort({
  primitiveAdapter: createLightweightSeriesPrimitiveAdapter({
    createPrimitive: (projection) => createRectangleRenderPrimitive(projection, {
      centerOnStartAnchorSlot: true,
    }),
    series,
  }),
});
const interactionPort = createLightweightAnnotationInteractionPort({
  chart,
  host,
  paneId: 'pane-main',
  resolveInstrumentId: () => instrumentId,
  resolveMarketEpochMs: ({ displayEpochMs }) => displayEpochMs,
  series,
});
let highlightRevision = 0;
let pickerSequence = 0;
let renderRequest = 0;
const selections = [];

function presentation(color, opacity) {
  return Object.freeze({
    fillColor: color,
    fillOpacity: opacity,
    schemaVersion: 1,
    strokeColor: color,
    strokeWidth: 2,
  });
}

function highlightProjection(selection, color, opacity) {
  const bar = barsByEpochMs.get(selection.barStartEpochMs);
  if (!bar) return null;
  const geometry = geometryContract.createRectangleGeometry({
    firstAnchor: geometryContract.createMarketAnchor({
      epochMs: selection.barStartEpochMs,
      instrumentId,
      price: bar.low,
    }),
    secondAnchor: geometryContract.createMarketAnchor({
      epochMs: selection.barStartEpochMs + (MINUTE_SECONDS * 1_000),
      instrumentId,
      price: bar.high,
    }),
  });
  return createAnnotationProjection({
    entityId: 'picker.exact-bar',
    geometry: geometryContract.readDrawingGeometry(geometry),
    presentation: presentation(color, opacity),
    projectionId: 'projection.exact-bar',
    revision: ++highlightRevision,
  });
}

function renderHighlight(snapshot) {
  const request = ++renderRequest;
  const target = snapshot.status === 'armed'
    ? snapshot.candidateSelection
    : snapshot.lastSelection;
  const color = snapshot.status === 'armed' ? '#22d3ee' : '#a3e635';
  const opacity = snapshot.status === 'armed' ? 0.20 : 0.30;
  host.dataset.highlightColor = target === null ? '' : color;
  if (target === null && highlightPort.snapshot().activePreviewId === null) return;
  const pending = target === null
    ? highlightPort.clear(highlightIdentity)
    : highlightPort.replace(highlightIdentity, [highlightProjection(target, color, opacity)]);
  pending.catch((error) => {
    if (request !== renderRequest) return;
    host.dataset.lastError = `${error.code ?? error.name}:${error.message}`;
  });
}

function textFor(snapshot) {
  const selection = snapshot.status === 'armed'
    ? snapshot.candidateSelection
    : snapshot.lastSelection;
  if (snapshot.status === 'armed' && selection === null) return 'Armed · hover an exact candle';
  if (selection === null) return `Idle · ${snapshot.acceptedSelectionCount} accepted`;
  const iso = new Date(selection.barStartEpochMs).toISOString().replace('.000Z', 'Z');
  return snapshot.status === 'armed'
    ? `Candidate · ${iso}`
    : `Selected · ${iso} · ${snapshot.acceptedSelectionCount} accepted`;
}

const controller = createExactAnnotationBarPickerController({
  interactionPort,
  onError(error) {
    host.dataset.lastError = `${error.code}:${error.message}`;
  },
  onSelection(selection) { selections.push(selection); },
  onStateChange(snapshot) {
    host.dataset.pickerStatus = snapshot.status;
    host.dataset.acceptedSelectionCount = String(snapshot.acceptedSelectionCount);
    armButton.setAttribute('aria-pressed', String(snapshot.status === 'armed'));
    status.textContent = textFor(snapshot);
    renderHighlight(snapshot);
  },
});

function arm() {
  controller.arm({ pickerId: `picker-${++pickerSequence}` });
}

armButton.addEventListener('click', () => {
  if (controller.snapshot().status === 'idle') arm();
  else controller.cancel('toolbar-toggle');
});
cancelButton.addEventListener('click', () => controller.cancel('toolbar-cancel'));

function nativeOptionsUnchanged() {
  return JSON.stringify({
    handleScale: chart.options().handleScale,
    handleScroll: chart.options().handleScroll,
  }) === initialNativeOptions;
}

globalThis.__annotationBarPickerFixture = Object.freeze({
  arm,
  cancel: (reason = 'fixture-cancel') => controller.cancel(reason),
  clientPointForIndex(index) {
    const rect = host.getBoundingClientRect();
    return Object.freeze({
      x: rect.left + chart.timeScale().timeToCoordinate(bars[index].time),
      y: rect.top + (rect.height * 0.45),
    });
  },
  async dispose() {
    controller.dispose();
    interactionPort.dispose();
    await highlightPort.dispose();
    chart.remove();
  },
  snapshot: () => Object.freeze({
    afterData: JSON.stringify(series.data()),
    beforeData,
    controller: controller.snapshot(),
    highlight: highlightPort.snapshot(),
    interaction: interactionPort.snapshot(),
    nativeOptionsUnchanged: nativeOptionsUnchanged(),
    selections: [...selections],
    visibleLogicalRange: chart.timeScale().getVisibleLogicalRange(),
  }),
});

status.textContent = 'Idle · 0 accepted';
host.dataset.scenario = 'ready';
