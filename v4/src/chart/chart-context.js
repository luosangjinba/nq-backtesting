// Unified chart context descriptors for primary and secondary chart workflows.
// Step 118 foundation only: existing callers can opt in gradually.

import * as primaryChart from './chart-manager.js';
import * as secondaryChart from './secondary-chart-manager.js';
import * as primaryStore from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';

export const CHART_CONTEXT_IDS = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
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

function getSecondaryContext() {
  const chart = secondaryChart.getSecondaryChart();
  const series = secondaryChart.getSecondarySeries();
  const coordinateToTime = (x) => chart?.timeScale?.().coordinateToTime(x) ?? null;
  const coordinateToPrice = (y) => series?.coordinateToPrice?.(y) ?? null;
  const timeToCoordinate = (time) => chart?.timeScale?.().timeToCoordinate(time) ?? null;
  const priceToCoordinate = (price) => series?.priceToCoordinate?.(price) ?? null;
  const onClick = (callback) => chart?.subscribeClick?.(callback);
  const onCrosshairMove = (callback) => chart?.subscribeCrosshairMove?.(callback);

  return {
    id: CHART_CONTEXT_IDS.SECONDARY,
    chartId: CHART_CONTEXT_IDS.SECONDARY,
    label: 'Secondary',
    instrument: secondaryStore.getSecondaryInstrument(),
    timeframe: secondaryStore.getSecondaryTimeframe(),
    enabled: Boolean(secondaryStore.isSecondaryEnabled() && chart && series),
    readonly: true,
    getChart: secondaryChart.getSecondaryChart,
    getSeries: secondaryChart.getSecondarySeries,
    getDisplayBars: () => cloneBars(secondaryStore.getSecondaryDisplayBars),
    getAllBars: () => cloneBars(secondaryStore.getSecondaryBars),
    getCurrentRange: secondaryStore.getSecondaryCurrentRange,
    coordinateToTime,
    coordinateToPrice,
    timeToCoordinate,
    priceToCoordinate,
    attachPrimitive: secondaryChart.attachSecondaryPrimitive,
    detachPrimitive: secondaryChart.detachSecondaryPrimitive,
    clearPrimitives: secondaryChart.clearSecondaryPrimitives,
    onClick,
    onCrosshairMove,
  };
}

export function getChartContext(chartId = CHART_CONTEXT_IDS.PRIMARY) {
  return chartId === CHART_CONTEXT_IDS.SECONDARY ? getSecondaryContext() : getPrimaryContext();
}

export function getPrimaryChartContext() {
  return getPrimaryContext();
}

export function getSecondaryChartContext() {
  return getSecondaryContext();
}

export function getAvailableChartContexts() {
  return [getPrimaryContext(), getSecondaryContext()].filter((context) => context.enabled);
}

export function isSecondaryChartContext(context) {
  return context?.chartId === CHART_CONTEXT_IDS.SECONDARY;
}

export function isPrimaryChartContext(context) {
  return !context || context.chartId === CHART_CONTEXT_IDS.PRIMARY;
}
