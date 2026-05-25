// Readonly PDA overlay for the split-screen secondary chart.

import * as bus from '../event-bus.js';
import {
  attachSecondaryPrimitive,
  clearSecondaryPrimitives,
  getSecondaryChart,
  getSecondarySeries,
} from '../chart/secondary-chart-manager.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getStructureOverlayVisibility } from '../display/overlay-visibility.js';
import { FibPrimitive, LiquidityPrimitive, PointSetPrimitive, RangePrimitive } from '../chart/primitives.js';
import { buildCePrice } from '../price-utils.js';
import { formatPrimaryContextLabel, getBucketStart } from './pda-context.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType } from './pda-types.js';
import { getSegments } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';

let renderedPrimitives = [];
const DEFAULT_EXTEND_BARS = 8;

function clearRenderedPrimitives() {
  renderedPrimitives = clearSecondaryPrimitives(renderedPrimitives);
}

function mapTimestampToSecondaryChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;

  const timeframe = secondaryStore.getSecondaryTimeframe();
  const bucketStart = getBucketStart(Number(timestamp), timeframe);
  if (timeframe === 1440) {
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function getPointRenderTime(annotation) {
  return (
    mapTimestampToSecondaryChartTime(annotation.canonicalTimestamp) ??
    mapTimestampToSecondaryChartTime(annotation.timestamp) ??
    annotation.anchorTime
  );
}

function getRangeRenderTime(annotation, field, fallbackField) {
  const timestamp = annotation[`${field}Timestamp`] ?? annotation[field];
  return mapTimestampToSecondaryChartTime(timestamp) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function getNestedPointRenderTime(point, fallbackTime) {
  return (
    mapTimestampToSecondaryChartTime(point?.canonicalTimestamp) ??
    mapTimestampToSecondaryChartTime(point?.timestamp) ??
    point?.time ??
    fallbackTime
  );
}

function getAnnotationLabel(annotation, pdaType) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  return contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
}

function getExtendBars(annotation, fallback = 0) {
  const value = annotation.display?.extendBars ?? annotation.extendBars ?? fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function shouldShowLabel(annotation) {
  return annotation.display?.showLabel ?? annotation.showLabel ?? true;
}

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function getCePrice(annotation, topPrice, bottomPrice) {
  if (Number.isFinite(Number(annotation.ce?.price))) return annotation.ce;
  return buildCePrice(topPrice, bottomPrice);
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function isVisibleColor(color) {
  return color && color !== 'transparent';
}

function getRangeMidlineColor(annotation, pdaType) {
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#26a69a';
  if (annotation.type === 'fvg' && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function getRangeBorderColor(annotation, pdaType) {
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  if (isFvg) return 'transparent';
  return annotation.borderColor || pdaType.color;
}

function attachPdaPrimitive(primitive) {
  attachSecondaryPrimitive(primitive);
  primitive.requestUpdate();
  renderedPrimitives.push(primitive);
}

function buildLiquidityPrimitive(chartInstance, series, annotation, pdaType) {
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;

  return new LiquidityPrimitive(
    chartInstance,
    series,
    anchorTime,
    annotation.price,
    pdaType.color,
    pdaType.textColor,
    getAnnotationLabel(annotation, pdaType),
    pdaType.labelPosition,
    {
      lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
      lineWidth: annotation.type === 'wick-ce' ? 1 : 2,
      labelFont: '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function buildRangePrimitive(chartInstance, series, annotation, pdaType) {
  const topPrice = annotation.topPrice ?? annotation.priceHigh;
  const bottomPrice = annotation.bottomPrice ?? annotation.priceLow;
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime');
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime');

  if (
    startTime === undefined ||
    endTime === undefined ||
    topPrice === undefined ||
    bottomPrice === undefined
  ) {
    return null;
  }

  const ce = getCePrice(annotation, topPrice, bottomPrice);
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';

  return new RangePrimitive(
    chartInstance,
    series,
    startTime,
    endTime,
    topPrice,
    bottomPrice,
    getAnnotationLabel(annotation, pdaType),
    {
      fillColor: annotation.fillColor || alphaColor(pdaType.color, '26'),
      borderColor: getRangeBorderColor(annotation, pdaType),
      midlineColor: getRangeMidlineColor(annotation, pdaType),
      textColor: annotation.textColor || pdaType.textColor || '#d1d4dc',
      lineWidth: isFvg ? 0 : 1,
      showMidline: getShowCe(annotation),
      midlinePrice: ce?.price ?? null,
      extendBars: getExtendBars(annotation, 0),
      labelFont: '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function buildPointSetPrimitive(chartInstance, series, annotation, pdaType) {
  const points = Array.isArray(annotation.points)
    ? annotation.points
        .map((point) => ({
          time:
            mapTimestampToSecondaryChartTime(point.canonicalTimestamp) ??
            mapTimestampToSecondaryChartTime(point.timestamp) ??
            point.anchorTime,
          price: point.price,
        }))
        .filter((point) => point.time !== undefined && point.time !== null && point.price !== undefined)
    : [];
  if (points.length < 1) return null;

  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;

  return new PointSetPrimitive(
    chartInstance,
    series,
    points,
    referencePrice,
    getAnnotationLabel(annotation, pdaType),
    {
      lineColor: annotation.color || pdaType.color,
      textColor: annotation.textColor || pdaType.textColor || '#d1d4dc',
      markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
      lineWidth: 1,
      markerSize: 4,
      extendBars: getExtendBars(annotation, 0),
      labelFont: '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = Number(annotation.start?.price);
  const endPrice = Number(annotation.end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;
  return endPrice - (endPrice - startPrice) * Number(levelValue);
}

function buildFibPrimitive(chartInstance, series, annotation, pdaType) {
  const start = annotation.start || {};
  const end = annotation.end || {};
  const startTime = getNestedPointRenderTime(start, annotation.startTime);
  const endTime = getNestedPointRenderTime(end, annotation.endTime);
  const startPrice = Number(start.price);
  const endPrice = Number(end.price);
  if (startTime === undefined || startTime === null || endTime === undefined || endTime === null) return null;
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;

  const levels = Array.isArray(annotation.levels)
    ? annotation.levels
        .filter((level) => level?.visible !== false && Number.isFinite(Number(level.value)))
        .map((level) => ({
          value: level.value,
          price: getFibLevelPrice(annotation, level.value),
          color: level.color || pdaType.color,
        }))
        .filter((level) => Number.isFinite(Number(level.price)))
    : [];
  if (!levels.length) return null;

  return new FibPrimitive(chartInstance, series, startTime, startPrice, endTime, endPrice, levels, {
    lineColor: annotation.color || pdaType.color,
    textColor: annotation.textColor || pdaType.textColor || '#d1d4dc',
    lineWidth: 1,
    extendBars: getExtendBars(annotation, 0),
    showLabels: annotation.display?.showLabel ?? annotation.display?.showLabels ?? true,
    showTrendLine: annotation.display?.showTrendLine ?? false,
    trendLineColor: annotation.trendLineColor || '#787b86',
    trendLineWidth: 1,
  });
}

export function renderSecondaryPdaAnnotations() {
  clearRenderedPrimitives();

  if (!secondaryStore.isSecondaryEnabled()) return;

  const chartInstance = getSecondaryChart();
  const series = getSecondarySeries();
  if (!chartInstance || !series) return;

  const annotations = getAnnotations();
  const visibility = getStructureOverlayVisibility({
    annotations,
    segments: getSegments(),
    groups: getSegmentGroups(),
  });

  annotations.forEach((annotation) => {
    if (!visibility.visiblePdaIds.has(annotation.id)) return;
    if (visibility.hiddenPdaIds.has(annotation.id)) return;

    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(chartInstance, series, annotation, pdaType);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(chartInstance, series, annotation, pdaType);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(chartInstance, series, annotation, pdaType);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'fib-retracement') {
      const primitive = buildFibPrimitive(chartInstance, series, annotation, pdaType);
      if (primitive) attachPdaPrimitive(primitive);
    }
  });
}

export function initSecondaryPdaRenderer() {
  bus.on('pda:changed', renderSecondaryPdaAnnotations);
  bus.on('pda:selected', renderSecondaryPdaAnnotations);
  bus.on('pda:selection-cleared', renderSecondaryPdaAnnotations);
  bus.on('segment:selected', renderSecondaryPdaAnnotations);
  bus.on('segment:selection-cleared', renderSecondaryPdaAnnotations);
  bus.on('segment-group:selected', renderSecondaryPdaAnnotations);
  bus.on('segment-group:selection-cleared', renderSecondaryPdaAnnotations);
  bus.on('display-mode:changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:loaded', renderSecondaryPdaAnnotations);
  bus.on('secondary-chart:settings-changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:cleared', clearRenderedPrimitives);
  bus.on('secondary-chart:reset', clearRenderedPrimitives);
}
