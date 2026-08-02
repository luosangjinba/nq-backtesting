import {
  CandlestickSeries,
  createChart,
  LineSeries,
  version as lightweightChartsVersion,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { CANDLE_OPTIONS, createChartOptions } from './chart-options.js';
import { createCurrentPriceNamePrimitive } from './current-price-presentation.js';
import { createReplayTruncationInteraction } from './replay-truncation-interaction.js';

export function createLightweightChartSurface({ host, interactionIndex, onTruncationSelect }) {
  const chart = createChart(host, createChartOptions(undefined, {
    resolveTimeLabel: interactionIndex.timeLabelAt,
  }));
  const series = chart.addSeries(CandlestickSeries, CANDLE_OPTIONS);
  const currentPriceName = createCurrentPriceNamePrimitive();
  series.attachPrimitive(currentPriceName.primitive);
  const futureTimeAxisSeries = chart.addSeries(LineSeries, Object.freeze({
    crosshairMarkerVisible: false,
    lastValueVisible: false,
    lineVisible: false,
    priceLineVisible: false,
  }));
  const priceScale = chart.priceScale('right');
  const truncationInteraction = createReplayTruncationInteraction({
    chart, host, interactionIndex, onSelect: onTruncationSelect,
  });
  host.dataset.libraryVersion = lightweightChartsVersion();
  host.dataset.gridVisible = 'true';
  return Object.freeze({
    chart,
    currentPriceName,
    futureTimeAxisSeries,
    libraryVersion: lightweightChartsVersion(),
    priceScale,
    series,
    truncationInteraction,
  });
}
