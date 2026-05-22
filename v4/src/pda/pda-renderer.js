// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, PointSetPrimitive, RangePrimitive } from '../chart/primitives.js';
import { buildCePrice } from '../price-utils.js';
import { getAnnotations } from './pda-store.js';
import { formatPrimaryContextLabel, getBucketStart } from './pda-context.js';
import { getPdaType } from './pda-types.js';
import { getSelectedPda } from './pda-selection.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { getIsolatedSegment, getSegmentById } from '../segment/segment-store.js';

let renderedPrimitives = [];
const SELECTED_COLOR = '#f0f3fa';
const LINKED_SEGMENT_COLOR = '#ffcc80';
const DEFAULT_EXTEND_BARS = 8;

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives);
}

function mapTimestampToCurrentChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  const timeframe = store.getCurrentTimeframe();
  const bucketStart = getBucketStart(Number(timestamp), timeframe);
  if (timeframe === 1440) {
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function getPointRenderTime(annotation) {
  return (
    mapTimestampToCurrentChartTime(annotation.canonicalTimestamp) ??
    mapTimestampToCurrentChartTime(annotation.timestamp) ??
    annotation.anchorTime
  );
}

function getRangeRenderTime(annotation, field, fallbackField) {
  const timestamp = annotation[`${field}Timestamp`] ?? annotation[field];
  return mapTimestampToCurrentChartTime(timestamp) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function getAnnotationLabel(annotation, pdaType, selected = false, linkedToSegment = false) {
  const contextLabel = formatPrimaryContextLabel(annotation.contexts);
  const baseLabel = contextLabel ? `${pdaType.label} · ${contextLabel}` : pdaType.label;
  if (selected) return `● ${baseLabel}`;
  if (linkedToSegment) return `↔ ${baseLabel}`;
  return baseLabel;
}

function getExtendBars(annotation, fallback = 0) {
  const value = annotation.display?.extendBars ?? annotation.extendBars ?? fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getShowCe(annotation) {
  return annotation.display?.showCe ?? annotation.showCe ?? true;
}

function getCePrice(annotation, topPrice, bottomPrice) {
  if (Number.isFinite(Number(annotation.ce?.price))) return annotation.ce;
  return buildCePrice(topPrice, bottomPrice);
}

function isCurrentAnnotation(annotation, selection) {
  return Boolean(selection?.id && annotation?.id && String(selection.id) === String(annotation.id));
}

function getSelectedSegmentPdaState() {
  const getResponseDisplayMode = (response) =>
    response.displayMode || (response.selected === false ? 'normal' : 'highlight');
  const isolatedSegment = getIsolatedSegment();
  if (isolatedSegment) {
    const responses = Array.isArray(isolatedSegment.pdaResponses) ? isolatedSegment.pdaResponses : [];
    const visibleResponses = responses.filter((response) => getResponseDisplayMode(response) !== 'hidden');
    return {
      highlightIds: new Set(
        visibleResponses
          .filter((response) => getResponseDisplayMode(response) === 'highlight')
          .map((response) => response.pdaId)
          .filter(Boolean)
      ),
      visibleIds: new Set(visibleResponses.map((response) => response.pdaId).filter(Boolean)),
      hiddenIds: new Set(
        responses
          .filter((response) => getResponseDisplayMode(response) === 'hidden')
          .map((response) => response.pdaId)
          .filter(Boolean)
      ),
      isolate: true,
    };
  }

  const selection = getSelectedSegment();
  if (!selection?.id) {
    return {
      highlightIds: new Set(),
      visibleIds: new Set(),
      hiddenIds: new Set(),
      isolate: false,
    };
  }

  const segment = getSegmentById(selection.id);
  const responses = Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : [];
  return {
    highlightIds: new Set(
      responses
        .filter((response) => getResponseDisplayMode(response) === 'highlight')
        .map((response) => response.pdaId)
        .filter(Boolean)
    ),
    visibleIds: new Set(responses.map((response) => response.pdaId).filter(Boolean)),
    hiddenIds: new Set(
      responses
        .filter((response) => getResponseDisplayMode(response) === 'hidden')
        .map((response) => response.pdaId)
        .filter(Boolean)
    ),
    isolate: segment?.display?.isolate ?? false,
  };
}

function getHighlightColor(isCurrent, isLinkedToSegment, fallback) {
  if (isCurrent) return SELECTED_COLOR;
  if (isLinkedToSegment) return LINKED_SEGMENT_COLOR;
  return fallback;
}

function shouldShowLabel(annotation) {
  return annotation.display?.showLabel ?? annotation.showLabel ?? true;
}

function buildLiquidityPrimitive(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
  const label = getAnnotationLabel(annotation, pdaType, isCurrent, isLinkedToSegment);
  const anchorTime = getPointRenderTime(annotation);
  if (anchorTime === undefined || anchorTime === null) return null;
  const lineColor = getHighlightColor(isCurrent, isLinkedToSegment, pdaType.color);
  const textColor = getHighlightColor(isCurrent, isLinkedToSegment, pdaType.textColor);

  return new LiquidityPrimitive(
    chart.getChart(),
    chart.getSeries(),
    anchorTime,
    annotation.price,
    lineColor,
    textColor,
    label,
    pdaType.labelPosition,
    {
      lineLength: getExtendBars(annotation, DEFAULT_EXTEND_BARS),
      lineWidth: isCurrent || isLinkedToSegment ? 3 : 2,
      labelFont: isCurrent || isLinkedToSegment ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function alphaColor(hexColor, alphaHex = '33') {
  return hexColor?.startsWith('#') && hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function isVisibleColor(color) {
  return color && color !== 'transparent';
}

function getRangeMidlineColor(annotation, pdaType, isCurrent = false, isFvg = false, isLinkedToSegment = false) {
  if (isCurrent) return SELECTED_COLOR;
  if (isLinkedToSegment) return LINKED_SEGMENT_COLOR;
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (isFvg && annotation.direction === 'bullish') return '#26a69a';
  if (isFvg && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function buildRangePrimitive(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
  const label = getAnnotationLabel(annotation, pdaType, isCurrent, isLinkedToSegment);
  const isFvg = annotation.type === 'fvg';
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

  return new RangePrimitive(
    chart.getChart(),
    chart.getSeries(),
    startTime,
    endTime,
    topPrice,
    bottomPrice,
    label,
    {
      fillColor: annotation.fillColor || alphaColor(pdaType.color, '33'),
      borderColor: isFvg
        ? 'transparent'
        : getHighlightColor(isCurrent, isLinkedToSegment, annotation.borderColor || pdaType.color),
      midlineColor: getRangeMidlineColor(annotation, pdaType, isCurrent, isFvg, isLinkedToSegment),
      textColor: getHighlightColor(
        isCurrent,
        isLinkedToSegment,
        annotation.textColor || pdaType.textColor || '#d1d4dc'
      ),
      lineWidth: isFvg ? 0 : isCurrent || isLinkedToSegment ? 2 : 1,
      showMidline: getShowCe(annotation),
      midlinePrice: ce?.price ?? null,
      extendBars: getExtendBars(annotation, 0),
      labelFont: isCurrent || isLinkedToSegment ? '12px sans-serif' : '11px sans-serif',
      showLabel: shouldShowLabel(annotation),
    }
  );
}

function buildPointSetPrimitive(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
  const points = Array.isArray(annotation.points)
    ? annotation.points
        .map((point) => ({
          time:
            mapTimestampToCurrentChartTime(point.canonicalTimestamp) ??
            mapTimestampToCurrentChartTime(point.timestamp) ??
            point.anchorTime,
          price: point.price,
        }))
        .filter((point) => point.time !== undefined && point.time !== null && point.price !== undefined)
    : [];
  if (points.length < 1) return null;

  const label = getAnnotationLabel(annotation, pdaType, isCurrent, isLinkedToSegment);
  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;

  return new PointSetPrimitive(chart.getChart(), chart.getSeries(), points, referencePrice, label, {
    lineColor: getHighlightColor(isCurrent, isLinkedToSegment, annotation.color || pdaType.color),
    textColor: getHighlightColor(
      isCurrent,
      isLinkedToSegment,
      annotation.textColor || pdaType.textColor || '#d1d4dc'
    ),
    markerPosition: annotation.markerPosition || pdaType.labelPosition || 'above',
    lineWidth: isCurrent || isLinkedToSegment ? 2 : 1,
    markerSize: isCurrent || isLinkedToSegment ? 5 : 4,
    extendBars: getExtendBars(annotation, 0),
    labelFont: isCurrent || isLinkedToSegment ? '12px sans-serif' : '11px sans-serif',
    showLabel: shouldShowLabel(annotation),
  });
}

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedPda();
  const segmentPdaState = getSelectedSegmentPdaState();
  getAnnotations().forEach((annotation) => {
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isCurrent = isCurrentAnnotation(annotation, selected);
    const isLinkedToSegment = segmentPdaState.highlightIds.has(annotation.id);
    if (segmentPdaState.hiddenIds.has(annotation.id)) return;
    if (segmentPdaState.isolate && !segmentPdaState.visibleIds.has(annotation.id)) return;

    if (pdaType.shape === 'liquidity-line') {
      const primitive = buildLiquidityPrimitive(annotation, pdaType, isCurrent, isLinkedToSegment);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'range') {
      const primitive = buildRangePrimitive(annotation, pdaType, isCurrent, isLinkedToSegment);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
      return;
    }

    if (pdaType.shape === 'point-set') {
      const primitive = buildPointSetPrimitive(annotation, pdaType, isCurrent, isLinkedToSegment);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
    }
  });
}

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('pda:selected', renderPdaAnnotations);
  bus.on('pda:selection-cleared', renderPdaAnnotations);
  bus.on('segment:selected', renderPdaAnnotations);
  bus.on('segment:selection-cleared', renderPdaAnnotations);
  bus.on('segment:changed', renderPdaAnnotations);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
