// Readonly PDA overlay for the split-screen secondary chart.

import * as bus from '../event-bus.js';
import {
  attachSecondaryPrimitive,
  detachSecondaryPrimitive,
  getSecondaryChart,
  getSecondarySeries,
} from '../chart/secondary-chart-manager.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { getStructureOverlayVisibility } from '../display/overlay-visibility.js';
import { FibPrimitive, LiquidityPrimitive, PointSetPrimitive, RangePrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { createPrimitiveCache } from '../chart/primitive-cache.js';
import { buildCePrice } from '../price-utils.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType, OB_COLORS } from './pda-types.js';
import { getVisibleFibLevels } from './fib-levels.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { formatPdaDisplayLabel } from './pda-source-format.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';
import { getSelectedPda } from './pda-selection.js';
import { getSegments } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';
import { getChartLabelFont } from '../display/display-preferences.js';
import { createRafThrottle } from '../utils/raf-throttle.js';

const DEFAULT_EXTEND_BARS = 8;
const HIGHLIGHT_COLOR = '#ffcc80';
const primitiveCache = createPrimitiveCache({
  attach: (primitive) => attachSecondaryPrimitive(primitive),
  detach: (primitive) => detachSecondaryPrimitive(primitive),
});

function clearRenderedPrimitives() {
  primitiveCache.clear();
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

function buildTimeOnlyProjectionDescriptors(chartInstance, annotation, pdaType, isHighlighted = false) {
  const color = isHighlighted ? HIGHLIGHT_COLOR : 'rgba(178, 181, 190, 0.72)';
  const label = getAnnotationLabel(annotation, pdaType);
  return getPdaProjectionTimestamps(annotation)
    .map(mapTimestampToSecondaryChartTime)
    .filter((time, index, times) => time !== null && time !== undefined && times.indexOf(time) === index)
    .map((time, index) => {
      const options = {
        color,
        lineWidth: isHighlighted ? 2 : 1,
        lineDash: [4, 4],
        label: index === 0 ? label : '',
        labelBorderColor: color,
      };
      return {
        key: `pda:${annotation.id}:secondary:time:${index}`,
        type: 'pda-time',
        create: () => new VerticalLinePrimitive(chartInstance, time, options),
        update: (primitive) => primitive.update({ time, options }),
      };
    });
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
  if (annotation.type === 'ifvg') return '#b39ddb';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd835';
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (annotation.type === 'fvg' && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function getRangeBorderColor(annotation, pdaType, isHighlighted = false) {
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  if (isHighlighted) return HIGHLIGHT_COLOR;
  if (isFvg) return 'transparent';
  return annotation.borderColor || pdaType.color;
}

function getRangeFillColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.fillColor;
  if (annotation.type === 'ifvg') return '#b39ddb33';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd83533';
  return annotation.fillColor || alphaColor(pdaType.color, '26');
}

function getRangeTextColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.textColor;
  if (annotation.type === 'ifvg') return '#ede7f6';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fff9c4';
  return annotation.textColor || pdaType.textColor || '#d1d4dc';
}

function buildLiquidityDescriptor(chartInstance, series, annotation, pdaType, isHighlighted = false) {
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;
  const lineColor = getHighlightColor(isHighlighted, pdaType.color);
  const textColor = getHighlightColor(isHighlighted, pdaType.textColor);
  const label = getAnnotationLabel(annotation, pdaType);
  const options = {
    lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
    lineWidth: annotation.type === 'wick-ce' ? 1 : isHighlighted ? 3 : 2,
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  };

  return {
    key: `pda:${annotation.id}:secondary:liquidity`,
    type: 'pda-liquidity',
    create: () => new LiquidityPrimitive(
      chartInstance,
      series,
      anchorTime,
      annotation.price,
      lineColor,
      textColor,
      label,
      pdaType.labelPosition,
      options
    ),
    update: (primitive) => primitive.update({
      anchorTime,
      price: annotation.price,
      lineColor,
      textColor,
      label,
      position: pdaType.labelPosition,
      options,
    }),
  };
}

function buildRangeDescriptor(chartInstance, series, annotation, pdaType, isHighlighted = false) {
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
  const label = getAnnotationLabel(annotation, pdaType);
  const options = {
    fillColor: getRangeFillColor(annotation, pdaType),
    borderColor: getRangeBorderColor(annotation, pdaType, isHighlighted),
    midlineColor: getRangeMidlineColor(annotation, pdaType, isHighlighted),
    textColor: getHighlightColor(
      isHighlighted,
      getRangeTextColor(annotation, pdaType)
    ),
    lineWidth: isFvg && !isHighlighted ? 0 : isHighlighted ? 2 : 1,
    showMidline: getShowCe(annotation),
    midlinePrice: ce?.price ?? null,
    extendBars: getExtendBars(annotation, 0),
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  };

  return {
    key: `pda:${annotation.id}:secondary:range`,
    type: 'pda-range',
    create: () => new RangePrimitive(
      chartInstance,
      series,
      startTime,
      endTime,
      topPrice,
      bottomPrice,
      label,
      options
    ),
    update: (primitive) => primitive.update({
      startTime,
      endTime,
      topPrice,
      bottomPrice,
      label,
      options,
    }),
  };
}

function buildPointSetDescriptor(chartInstance, series, annotation, pdaType, isHighlighted = false) {
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
  const label = getAnnotationLabel(annotation, pdaType);
  const options = {
    lineColor: getHighlightColor(isHighlighted, annotation.color || pdaType.color),
    textColor: getHighlightColor(isHighlighted, annotation.textColor || pdaType.textColor || '#d1d4dc'),
    markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
    lineWidth: isHighlighted ? 2 : 1,
    markerSize: isHighlighted ? 5 : 4,
    extendBars: getExtendBars(annotation, 0),
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  };

  return {
    key: `pda:${annotation.id}:secondary:point-set`,
    type: 'pda-point-set',
    create: () => new PointSetPrimitive(chartInstance, series, points, referencePrice, label, options),
    update: (primitive) => primitive.update({
      points,
      referencePrice,
      label,
      options,
    }),
  };
}

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = Number(annotation.start?.price);
  const endPrice = Number(annotation.end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;
  return endPrice - (endPrice - startPrice) * Number(levelValue);
}

function buildFibDescriptor(chartInstance, series, annotation, pdaType, isHighlighted = false) {
  const start = annotation.start || {};
  const end = annotation.end || {};
  const startTime = getNestedPointRenderTime(start, annotation.startTime);
  const endTime = getNestedPointRenderTime(end, annotation.endTime);
  const startPrice = Number(start.price);
  const endPrice = Number(end.price);
  if (startTime === undefined || startTime === null || endTime === undefined || endTime === null) return null;
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;

  const levels = getVisibleFibLevels(annotation.levels)
    .map((level) => ({
      value: level.value,
      price: getFibLevelPrice(annotation, level.value),
      color: getHighlightColor(isHighlighted, level.color || pdaType.color),
    }))
    .filter((level) => Number.isFinite(Number(level.price)));
  if (!levels.length) return null;
  const options = {
    lineColor: getHighlightColor(isHighlighted, annotation.color || pdaType.color),
    textColor: getHighlightColor(isHighlighted, annotation.textColor || pdaType.textColor || '#d1d4dc'),
    lineWidth: isHighlighted ? 2 : 1,
    labelFont: getChartLabelFont(isHighlighted ? 12 : 11),
    extendBars: getExtendBars(annotation, 0),
    showLabels: annotation.display?.showLabel ?? annotation.display?.showLabels ?? true,
    showTrendLine: annotation.display?.showTrendLine ?? false,
    trendLineColor: getHighlightColor(isHighlighted, annotation.trendLineColor || '#787b86'),
    trendLineWidth: isHighlighted ? 2 : 1,
  };

  return {
    key: `pda:${annotation.id}:secondary:fib`,
    type: 'pda-fib',
    create: () => new FibPrimitive(chartInstance, series, startTime, startPrice, endTime, endPrice, levels, options),
    update: (primitive) => primitive.update({
      startTime,
      startPrice,
      endTime,
      endPrice,
      levels,
      options,
    }),
  };
}

export function renderSecondaryPdaAnnotations() {
  if (!secondaryStore.isSecondaryEnabled()) {
    clearRenderedPrimitives();
    return;
  }

  const chartInstance = getSecondaryChart();
  const series = getSecondarySeries();
  if (!chartInstance || !series || !secondaryStore.getSecondaryDisplayBars().length) {
    clearRenderedPrimitives();
    return;
  }

  const annotations = getAnnotations();
  const visibility = getStructureOverlayVisibility({
    annotations,
    segments: getSegments(),
    groups: getSegmentGroups(),
  });
  const selected = getSelectedPda();
  const descriptors = [];

  annotations.forEach((annotation) => {
    if (!visibility.visiblePdaIds.has(annotation.id)) return;
    if (visibility.hiddenPdaIds.has(annotation.id)) return;

    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isHighlighted = selected?.id === annotation.id || visibility.highlightPdaIds?.has(annotation.id);
    if (!canRenderPdaPriceProjection(annotation, secondaryStore.getSecondaryInstrument())) {
      descriptors.push(...buildTimeOnlyProjectionDescriptors(chartInstance, annotation, pdaType, isHighlighted));
      return;
    }

    if (pdaType.shape === 'liquidity-line') {
      const descriptor = buildLiquidityDescriptor(chartInstance, series, annotation, pdaType, isHighlighted);
      if (descriptor) descriptors.push(descriptor);
      return;
    }

    if (pdaType.shape === 'range') {
      const descriptor = buildRangeDescriptor(chartInstance, series, annotation, pdaType, isHighlighted);
      if (descriptor) descriptors.push(descriptor);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const descriptor = buildPointSetDescriptor(chartInstance, series, annotation, pdaType, isHighlighted);
      if (descriptor) descriptors.push(descriptor);
      return;
    }

    if (pdaType.shape === 'fib-retracement') {
      const descriptor = buildFibDescriptor(chartInstance, series, annotation, pdaType, isHighlighted);
      if (descriptor) descriptors.push(descriptor);
    }
  });

  primitiveCache.sync(descriptors);
}

const renderSecondaryPdaAnnotationsOnSelection = createRafThrottle(renderSecondaryPdaAnnotations);

export function initSecondaryPdaRenderer() {
  bus.on('pda:changed', renderSecondaryPdaAnnotations);
  bus.on('pda:selected', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('pda:selection-cleared', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('segment:selected', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('segment:selection-cleared', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('segment-group:selected', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('segment-group:selection-cleared', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('drawing-set-focus:changed', renderSecondaryPdaAnnotationsOnSelection);
  bus.on('display-mode:changed', renderSecondaryPdaAnnotations);
  bus.on('display-preferences:changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:loaded', renderSecondaryPdaAnnotations);
  bus.on('secondary-chart:settings-changed', renderSecondaryPdaAnnotations);
  bus.on('secondary-bars:cleared', clearRenderedPrimitives);
  bus.on('secondary-chart:reset', clearRenderedPrimitives);
}
