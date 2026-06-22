// Unified chart context descriptors for primary and Comparison Window workflows.
// Step 118 foundation only: existing callers can opt in gradually.

import * as primaryChart from './chart-manager.js';
import * as comparisonChart from './comparison-chart-manager.js';
import * as primaryStore from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import * as comparisonStore from '../comparison/comparison-window-store.js';

export const CHART_CONTEXT_IDS = Object.freeze({
  PRIMARY: 'primary',
  COMPARISON: 'comparison-window',
});

function cloneBars(getter) {
  const bars = getter?.();
  return Array.isArray(bars) ? bars : [];
}

function getPrimaryContext() {
  return {
    id: CHART_CONTEXT_IDS.PRIMARY,
    chartId: CHART_CONTEXT_IDS.PRIMARY,
    label: 'Primary',
    instrument: getPrimaryInstrument(),
    timeframe: primaryStore.getCurrentTimeframe(),
    enabled: Boolean(primaryChart.getChart() && primaryChart.getSeries()),
    readonly: false,
    getChart: primaryChart.getChart,
    getSeries: primaryChart.getSeries,
    getDisplayBars: () => cloneBars(primaryStore.getDisplayBars),
    getAllBars: () => cloneBars(primaryStore.getBars),
    getCurrentRange: primaryStore.getCurrentRange,
    coordinateToTime: primaryChart.coordinateToTime,
    coordinateToPrice: primaryChart.coordinateToPrice,
    timeToCoordinate: primaryChart.timeToCoordinate,
    priceToCoordinate: primaryChart.priceToCoordinate,
    attachPrimitive: primaryChart.attachPrimitive,
    detachPrimitive: primaryChart.detachPrimitive,
    clearPrimitives: primaryChart.clearPrimitives,
    onClick: primaryChart.onClick,
    onCrosshairMove: primaryChart.onCrosshairMove,
  };
}

function getComparisonContext() {
  const state = comparisonStore.getComparisonWindowState();
  const chart = comparisonChart.getComparisonChart();
  const series = comparisonChart.getComparisonSeries();
  const coordinateToTime = (x) => chart?.timeScale?.().coordinateToTime(x) ?? null;
  const coordinateToPrice = (y) => series?.coordinateToPrice?.(y) ?? null;
  const timeToCoordinate = (time) => chart?.timeScale?.().timeToCoordinate(time) ?? null;
  const priceToCoordinate = (price) => series?.priceToCoordinate?.(price) ?? null;
  const onClick = (callback) => chart?.subscribeClick?.(callback);
  const onCrosshairMove = (callback) => chart?.subscribeCrosshairMove?.(callback);

  return {
    id: CHART_CONTEXT_IDS.COMPARISON,
    chartId: CHART_CONTEXT_IDS.COMPARISON,
    label: 'Comparison',
    instrument: state.descriptor.instrument,
    timeframe: state.descriptor.timeframe,
    enabled: Boolean(state.enabled && chart && series),
    readonly: false,
    getChart: comparisonChart.getComparisonChart,
    getSeries: comparisonChart.getComparisonSeries,
    getDisplayBars: () => cloneBars(comparisonStore.getComparisonDisplayBars),
    getAllBars: () => cloneBars(comparisonStore.getComparisonBars),
    getCurrentRange: comparisonStore.getComparisonCurrentRange,
    coordinateToTime,
    coordinateToPrice,
    timeToCoordinate,
    priceToCoordinate,
    attachPrimitive: comparisonChart.attachComparisonPrimitive,
    detachPrimitive: comparisonChart.detachComparisonPrimitive,
    clearPrimitives: comparisonChart.clearComparisonPrimitives,
    onClick,
    onCrosshairMove,
  };
}

export function getChartContext(chartId = CHART_CONTEXT_IDS.PRIMARY) {
  if (chartId === CHART_CONTEXT_IDS.COMPARISON) return getComparisonContext();
  return getPrimaryContext();
}

export function getPrimaryChartContext() {
  return getPrimaryContext();
}

export function getComparisonChartContext() {
  return getComparisonContext();
}

export function getAvailableChartContexts() {
  return [getPrimaryContext(), getComparisonContext()].filter((context) => context.enabled);
}

export function isPrimaryChartContext(context) {
  return !context || context.chartId === CHART_CONTEXT_IDS.PRIMARY;
}

export function isComparisonChartContext(context) {
  return context?.chartId === CHART_CONTEXT_IDS.COMPARISON;
}
