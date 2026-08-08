import {
  CandlestickSeries,
  createChart,
} from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import {
  createMarketAnchor,
  createSegmentGeometry,
  readDrawingGeometry,
} from '../../../src/annotation-geometry-domain/public.js';
import {
  createAnnotationProjection,
  createChartAnnotationProjectionPort,
  createLightweightSeriesPrimitiveAdapter,
  createSegmentRenderPrimitive,
} from '../../../src/annotation-chart-projection/public.js';

const host = document.querySelector('#chart');
const chart = createChart(host, {
  autoSize: true,
  layout: { background: { color: '#05070a' }, textColor: '#a8b1bd' },
  rightPriceScale: { autoScale: false },
});
const series = chart.addSeries(CandlestickSeries, {
  downColor: '#f23645', borderVisible: false, upColor: '#089981',
  wickDownColor: '#f23645', wickUpColor: '#089981',
});
const bars = Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({
  close: 100 + index + (index % 2 ? -1 : 1),
  high: 103 + index,
  low: 97 + index,
  open: 100 + index,
  time: 1_700_000_000 + (index * 60),
})));
series.setData(bars);
const beforeData = JSON.stringify(series.data());
const handles = [];

function projection(revision, startOffset, endOffset, startPrice, endPrice) {
  const geometry = createSegmentGeometry({
    endAnchor: createMarketAnchor({
      epochMs: (1_700_000_000 + (endOffset * 60)) * 1_000,
      instrumentId: 'instrument.nq',
      price: endPrice,
    }),
    startAnchor: createMarketAnchor({
      epochMs: (1_700_000_000 + (startOffset * 60)) * 1_000,
      instrumentId: 'instrument.nq',
      price: startPrice,
    }),
  });
  return createAnnotationProjection({
    entityId: 'drawing.segment-fixture',
    geometry: readDrawingGeometry(geometry),
    projectionId: 'projection.segment-fixture',
    revision,
  });
}

const primitiveAdapter = createLightweightSeriesPrimitiveAdapter({
  createPrimitive(candidate) {
    const handle = createSegmentRenderPrimitive(candidate, { color: '#ff00ff', lineWidth: 4 });
    handles.push(handle);
    return handle;
  },
  series,
});
const port = createChartAnnotationProjectionPort({ primitiveAdapter });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function magentaPixels() {
  const canvas = chart.takeScreenshot();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] > 200 && pixels[index + 1] < 100 && pixels[index + 2] > 200) count += 1;
  }
  return count;
}

try {
  const preparedOne = port.prepare(7, [projection(1, 2, 8, 100, 110)]);
  const receiptOne = await port.apply(preparedOne);
  await port.finalize(preparedOne, receiptOne);
  chart.timeScale().fitContent();
  await frame();
  const paintedPixels = magentaPixels();

  const preparedTwo = port.prepare(8, [projection(2, 3, 9, 104, 112)]);
  const receiptTwo = await port.apply(preparedTwo);
  await port.finalize(preparedTwo, receiptTwo);
  await frame();
  const updatedPixels = magentaPixels();

  const preparedThree = port.prepare(9, []);
  const receiptThree = await port.apply(preparedThree);
  await frame();
  const detachedPixels = magentaPixels();
  await port.finalize(preparedThree, receiptThree);

  globalThis.__annotationProjectionResult = Object.freeze({
    acceptedAnnotationRevision: port.snapshot().acceptedAnnotationRevision,
    afterData: JSON.stringify(series.data()),
    beforeData,
    detachedPixels,
    destroyed: handles[0].snapshot().destroyed,
    handleCount: handles.length,
    paintedPixels,
    projectionCount: port.snapshot().projectionCount,
    updatedPixels,
  });
  globalThis.__disposeAnnotationProjectionFixture = async () => {
    await port.dispose();
    chart.remove();
  };
  host.dataset.scenario = 'ready';
} catch (error) {
  host.dataset.error = `${error.code ?? error.name}:${error.message}`;
  host.dataset.scenario = 'failed';
  throw error;
}
