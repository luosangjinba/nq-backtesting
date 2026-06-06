// Readonly PDA overlay for the split-screen secondary chart.

import * as bus from '../event-bus.js';
import {
  attachSecondaryPrimitive,
  clearSecondaryPrimitives,
  getSecondaryChart,
  getSecondarySeries,
} from '../chart/secondary-chart-manager.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getStructureOverlayVisibility } from '../display/overlay-visibility.js';
import { FibPrimitive, LiquidityPrimitive, PointSetPrimitive, RangePrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { buildCePrice } from '../price-utils.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType, OB_COLORS } from './pda-types.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { formatPdaDisplayLabel } from './pda-source-format.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';
import { getSelectedPda } from './pda-selection.js';
import { getSegments } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';

let renderedPrimitives = [];
const DEFAULT_EXTEND_BARS = 8;
const HIGHLIGHT_COLOR = '#ffcc80';

function clearRenderedPrimitives() {
  renderedPrimitives = clearSecondaryPrimitives(renderedPrimitives);
}

function mapTimestampToSecondaryChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;

  const timeframe = secondaryStore.getSecondaryTimeframe();
  return mapTimestampToChartTime(Number(timestamp), timeframe, secondaryStore.getSecondaryDisplayBars());
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
  return annotation.displayLabel || formatPdaDisplayLabel(annotation, pdaType.label);
}

function buildTimeOnlyProjectionPrimitives(chartInstance, annotation, pdaType, isHighlighted = false) {
  const color = isHighlighted ? HIGHLIGHT_COLOR : 'rgba(178, 181, 190, 0.72)';
  const label = getAnnotationLabel(annotation, pdaType);
  return getPdaProjectionTimestamps(annotation)
    .map(mapTimestampToSecondaryChartTime)
    .filter((time, index, times) => time !== null && time !== undefined && times.indexOf(time) === index)
    .map((time, index) => new VerticalLinePrimitive(chartInstance, time, {
      color,
      lineWidth: isHighlighted ? 2 : 1,
      lineDash: [4, 4],
      label: index === 0 ? label : '',
      labelBorderColor: color,
    }));
}

function getExtendBars(annotation, fallback = 0) {
  return getExtendBarsForTimeframe(annotation, fallback, secondaryStore.getSecondaryTimeframe());
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

function getHighlightColor(isHighlighted, fallback) {
  return isHighlighted ? HIGHLIGHT_COLOR : fallback;
}

function getRangeMidlineColor(annotation, pdaType, isHighlighted = false) {
  if (isHighlighted) return HIGHLIGHT_COLOR;
  if (annotation.type === 'ob') return OB_COLORS.color;
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#26a69a';
  if (annotation.type === 'fvg' && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function getRangeBorderColor(annotation, pdaType, isHighlighted = false) {
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  if (isHighlighted) return HIGHLIGHT_COLOR;
  if (isFvg) return 'transparent';
  return annotation.borderColor || pdaType.color;
}

function attachPdaPrimitive(primitive) {
  attachSecondaryPrimitive(primitive);
  primitive.requestUpdate();
  renderedPrimitives.push(primitive);
}

function buildLiquidityPrimitive(chartInstance, series, annotation, pdaType, isHighlighted = false) {
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;

  return new LiquidityPrimitive(
    chartInstance,
    series,
    anchorTime,
    annotation.price,
    getHighlightColor(isHighlighted, pdaType.color),
    getHighlightColor(isHighlighted, pdaType.textColor),
    getAnnotationLabel(annotation, pdaType),
    pdaType.labelPosition,
    {
      lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
      lineWidth: annotation.type === 'wick-ce' ? 1 : isHighlighted ? 3 : 2,
      labelFont: isHighlighted ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function buildRangePrimitive(chartInstance, series, annotation, pdaType, isHighlighted = false) {
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
      fillColor:
        annotation.type === 'ob' ? OB_COLORS.fillColor : annotation.fillColor || alphaColor(pdaType.color, '26'),
      borderColor: getRangeBorderColor(annotation, pdaType, isHighlighted),
      midlineColor: getRangeMidlineColor(annotation, pdaType, isHighlighted),
      textColor: getHighlightColor(
        isHighlighted,
        annotation.type === 'ob' ? OB_COLORS.textColor : annotation.textColor || pdaType.textColor || '#d1d4dc'
      ),
      lineWidth: isFvg && !isHighlighted ? 0 : isHighlighted ? 2 : 1,
      showMidline: getShowCe(annotation),
      midlinePrice: ce?.price ?? null,
      extendBars: getExtendBars(annotation, 0),
      labelFont: isHighlighted ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function buildPointSetPrimitive(chartInstance, series, annotation, pdaType, isHighlighted = false) {
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
      lineColor: getHighlightColor(isHighlighted, annotation.color || pdaType.color),
      textColor: getHighlightColor(isHighlighted, annotation.textColor || pdaType.textColor || '#d1d4dc'),
      markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
      lineWidth: isHighlighted ? 2 : 1,
      markerSize: isHighlighted ? 5 : 4,
      extendBars: getExtendBars(annotation, 0),
      labelFont: isHighlighted ? '12px sans-serif' : '11px sans-serif',
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

function buildFibPrimitive(chartInstance, series, annotation, pdaType, isHighlighted = false) {
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
          color: getHighlightColor(isHighlighted, level.color || pdaType.color),
        }))
        .filter((level) => Number.isFinite(Number(level.price)))
    : [];
  if (!levels.length) return null;

  return new FibPrimitive(chartInstance, series, startTime, startPrice, endTime, endPrice, levels, {
    lineColor: getHighlightColor(isHighlighted, annotation.color || pdaType.color),
    textColor: getHighlightColor(isHighlighted, annotation.textColor || pdaType.textColor || '#d1d4dc'),
    lineWidth: isHighlighted ? 2 : 1,
    extendBars: getExtendBars(annotation, 0),
    showLabels: annotation.display?.showLabel ?? annotation.display?.showLabels ?? true,
    showTrendLine: annotation.display?.showTrendLine ?? false,
    trendLineColor: getHighlightColor(isHighlighted, annotation.trendLineColor || '#787b86'),
    trendLineWidth: isHighlighted ? 2 : 1,
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
  const selected = getSelectedPda();

  annotations.forEach((annotation) => {
    if (!visibility.visiblePdaIds.has(annotation.id)) return;
    if (visibility.hiddenPdaIds.has(annotation.id)) return;

    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isHighlighted = selected?.id === annotation.id || visibility.highlightPdaIds?.has(annotation.id);
    if (!canRenderPdaPriceProjection(annotation, secondaryStore.getSecondaryInstrument())) {
      buildTimeOnlyProjectionPrimitives(chartInstance, annotation, pdaType, isHighlighted).forEach(attachPdaPrimitive);
      return;
    }

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(chartInstance, series, annotation, pdaType, isHighlighted);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(chartInstance, series, annotation, pdaType, isHighlighted);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(chartInstance, series, annotation, pdaType, isHighlighted);
      if (primitive) attachPdaPrimitive(primitive);
      return;
    }

    if (pdaType.shape === 'fib-retracement') {
      const primitive = buildFibPrimitive(chartInstance, series, annotation, pdaType, isHighlighted);
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
  bus.on('drawing-set-focus:changed', renderSecondaryPdaAnnotations);
  bus.on('display-mode:changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:loaded', renderSecondaryPdaAnnotations);
  bus.on('secondary-chart:settings-changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:cleared', clearRenderedPrimitives);
  bus.on('secondary-chart:reset', clearRenderedPrimitives);
}
