// Draw session PDA annotations on the chart.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import { FibPrimitive, LiquidityPrimitive, PointSetPrimitive, RangePrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { buildCePrice } from '../price-utils.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType, OB_COLORS } from './pda-types.js';
import { getVisibleFibLevels } from './fib-levels.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { formatPdaDisplayLabel } from './pda-source-format.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';
import { getSelectedPda } from './pda-selection.js';
import { getSelectedSegment, getSelectedSegmentGroup } from '../segment/segment-selection.js';
import { getIsolatedSegment, getSegmentById } from '../segment/segment-store.js';
import { getSegmentGroupById } from '../segment/segment-group-store.js';
import { getActiveDrawingSetVisibility } from '../segment/drawing-set-list.js';
import { shouldRenderPda } from '../display/display-mode.js';
import {
  getIsolateCompanionSegments,
  getIsolatePreviousIncludePda,
  getResponseDisplayMode,
} from '../segment/segment-isolate-view.js';
import { getReplayVisibleBars } from '../ui/replay-controls.js';
import { createRafThrottle } from '../utils/raf-throttle.js';
import { getChartLabelFont } from '../display/display-preferences.js';

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
  return mapTimestampToChartTime(Number(timestamp), timeframe, store.getDisplayBars());
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

function sameWeek(bar, weekStart) {
  const secondsPerWeek = 7 * 24 * 60 * 60;
  return bar.timestamp >= weekStart && bar.timestamp < weekStart + secondsPerWeek;
}

function sameSession(bar, sessionStart) {
  const secondsPerDay = 24 * 60 * 60;
  return bar.timestamp >= sessionStart && bar.timestamp < sessionStart + secondsPerDay;
}

function getNdogRenderBounds(annotation) {
  if (annotation.type !== 'ndog' || annotation.source !== 'objective') return null;
  const replayBars = getReplayVisibleBars();
  if (!replayBars?.length) return null;
  const sessionStart = annotation.canonicalTimestamp ?? annotation.timestamp;
  const sessionBars = replayBars.filter((bar) => sameSession(bar, sessionStart));
  if (!sessionBars.length) return null;
  return {
    startTimestamp: sessionBars[0].timestamp,
    endTimestamp: sessionBars[sessionBars.length - 1].timestamp,
  };
}

function getNwogRenderBounds(annotation) {
  if (annotation.type !== 'nwog' || annotation.source !== 'objective') return null;
  const replayBars = getReplayVisibleBars();
  if (!replayBars?.length) return null;
  const weekStart = annotation.canonicalTimestamp ?? annotation.timestamp;
  const weekBars = replayBars.filter((bar) => sameWeek(bar, weekStart));
  if (!weekBars.length) return null;
  return {
    startTimestamp: weekBars[0].timestamp,
    endTimestamp: weekBars[weekBars.length - 1].timestamp,
  };
}

function getNestedPointRenderTime(point, fallbackTime) {
  return (
    mapTimestampToCurrentChartTime(point?.canonicalTimestamp) ??
    mapTimestampToCurrentChartTime(point?.timestamp) ??
    point?.time ??
    fallbackTime
  );
}

function getAnnotationLabel(annotation, pdaType, selected = false, linkedToSegment = false) {
  const baseLabel = annotation.displayLabel || formatPdaDisplayLabel(annotation, pdaType.label);
  if (selected) return `● ${baseLabel}`;
  if (linkedToSegment) return `↔ ${baseLabel}`;
  return baseLabel;
}

function buildTimeOnlyProjectionPrimitives(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
  const chartInstance = chart.getChart();
  const label = getAnnotationLabel(annotation, pdaType, isCurrent, isLinkedToSegment);
  const color = isCurrent ? SELECTED_COLOR : isLinkedToSegment ? LINKED_SEGMENT_COLOR : 'rgba(178, 181, 190, 0.72)';
  return getPdaProjectionTimestamps(annotation)
    .map(mapTimestampToCurrentChartTime)
    .filter((time, index, times) => time !== null && time !== undefined && times.indexOf(time) === index)
    .map((time, index) => new VerticalLinePrimitive(chartInstance, time, {
      color,
      lineWidth: isCurrent || isLinkedToSegment ? 2 : 1,
      lineDash: [4, 4],
      label: index === 0 ? label : '',
      labelBorderColor: color,
    }));
}

function getExtendBars(annotation, fallback = 0) {
  return getExtendBarsForTimeframe(annotation, fallback, store.getCurrentTimeframe());
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
  const isolatedSegment = getIsolatedSegment();
  if (isolatedSegment) {
    const responses = Array.isArray(isolatedSegment.pdaResponses) ? isolatedSegment.pdaResponses : [];
    const visibleResponses = responses.filter((response) => getResponseDisplayMode(response) !== 'hidden');
    const companionResponses = getIsolatePreviousIncludePda(isolatedSegment)
      ? getIsolateCompanionSegments(isolatedSegment)
          .flatMap((segment) => (Array.isArray(segment.pdaResponses) ? segment.pdaResponses : []))
          .filter((response) => getResponseDisplayMode(response) !== 'hidden')
      : [];
    const companionVisibleIds = companionResponses.map((response) => response.pdaId).filter(Boolean);
    return {
      highlightIds: new Set(
        visibleResponses
          .filter((response) => getResponseDisplayMode(response) === 'highlight')
          .map((response) => response.pdaId)
          .filter(Boolean)
      ),
      visibleIds: new Set([
        ...visibleResponses.map((response) => response.pdaId).filter(Boolean),
        ...companionVisibleIds,
      ]),
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
    const groupSelection = getSelectedSegmentGroup();
    const group = groupSelection?.id ? getSegmentGroupById(groupSelection.id) : null;
    if (!group) {
      return {
        highlightIds: new Set(),
        visibleIds: new Set(),
        hiddenIds: new Set(),
        isolate: false,
      };
    }

    const segmentIds = new Set([
      ...(Array.isArray(group.childSegmentIds) ? group.childSegmentIds : []),
      group.targetSegmentId,
    ].filter(Boolean));
    const responses = Array.from(segmentIds)
      .map((id) => getSegmentById(id))
      .filter(Boolean)
      .flatMap((segment) => (Array.isArray(segment.pdaResponses) ? segment.pdaResponses : []));
    const visibleResponseIds = new Set(
      responses
        .filter((response) => getResponseDisplayMode(response) !== 'hidden')
        .map((response) => response.pdaId)
        .filter(Boolean)
    );

    return {
      highlightIds: new Set(
        responses
          .filter((response) => getResponseDisplayMode(response) === 'highlight')
          .map((response) => response.pdaId)
          .filter(Boolean)
      ),
      visibleIds: visibleResponseIds,
      hiddenIds: new Set(
        responses
          .filter((response) => getResponseDisplayMode(response) === 'hidden')
          .map((response) => response.pdaId)
          .filter((pdaId) => !visibleResponseIds.has(pdaId))
          .filter(Boolean)
      ),
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
  const lineWidth = annotation.type === 'wick-ce' ? 1 : isCurrent || isLinkedToSegment ? 3 : 2;

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
      lineWidth,
      labelFont: getChartLabelFont(isCurrent || isLinkedToSegment ? 12 : 11),
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
  if (annotation.type === 'ob') return OB_COLORS.color;
  if (annotation.type === 'ifvg') return '#b39ddb';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd835';
  if (isVisibleColor(annotation.midlineColor)) return annotation.midlineColor;
  if (isVisibleColor(annotation.borderColor)) return annotation.borderColor;
  if (annotation.type === 'fvg' && annotation.direction === 'bearish') return '#ef5350';
  return pdaType.color;
}

function getRangeBorderColor(annotation, pdaType, isCurrent = false, isFvg = false, isLinkedToSegment = false) {
  if (isFvg && !isCurrent && !isLinkedToSegment) return 'transparent';
  return getHighlightColor(isCurrent, isLinkedToSegment, annotation.borderColor || pdaType.color);
}

function getRangeFillColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.fillColor;
  if (annotation.type === 'ifvg') return '#b39ddb33';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fdd83533';
  return annotation.fillColor || alphaColor(pdaType.color, '33');
}

function getRangeTextColor(annotation, pdaType) {
  if (annotation.type === 'ob') return OB_COLORS.textColor;
  if (annotation.type === 'ifvg') return '#ede7f6';
  if (annotation.type === 'fvg' && annotation.direction === 'bullish') return '#fff9c4';
  return annotation.textColor || pdaType.textColor || '#d1d4dc';
}

function buildRangePrimitive(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
  const label = getAnnotationLabel(annotation, pdaType, isCurrent, isLinkedToSegment);
  const isFvg = annotation.type === 'fvg' || annotation.type === 'ifvg';
  const topPrice = annotation.topPrice ?? annotation.priceHigh;
  const bottomPrice = annotation.bottomPrice ?? annotation.priceLow;
  const renderBounds = getNdogRenderBounds(annotation) || getNwogRenderBounds(annotation);
  const startTime = renderBounds
    ? mapTimestampToCurrentChartTime(renderBounds.startTimestamp)
    : getRangeRenderTime(annotation, 'startTime', 'startTime');
  const endTime = renderBounds
    ? mapTimestampToCurrentChartTime(renderBounds.endTimestamp)
    : getRangeRenderTime(annotation, 'endTime', 'endTime');

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
      fillColor: getRangeFillColor(annotation, pdaType),
      borderColor: getRangeBorderColor(annotation, pdaType, isCurrent, isFvg, isLinkedToSegment),
      midlineColor: getRangeMidlineColor(annotation, pdaType, isCurrent, isFvg, isLinkedToSegment),
      textColor: getHighlightColor(
        isCurrent,
        isLinkedToSegment,
        getRangeTextColor(annotation, pdaType)
      ),
      lineWidth: isFvg && !isCurrent && !isLinkedToSegment ? 0 : isCurrent || isLinkedToSegment ? 2 : 1,
      showMidline: getShowCe(annotation),
      midlinePrice: ce?.price ?? null,
      extendBars: getExtendBars(annotation, 0),
      labelFont: getChartLabelFont(isCurrent || isLinkedToSegment ? 12 : 11),
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
    labelFont: getChartLabelFont(isCurrent || isLinkedToSegment ? 12 : 11),
    showLabel: shouldShowLabel(annotation),
  });
}

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = Number(annotation.start?.price);
  const endPrice = Number(annotation.end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;
  return endPrice - (endPrice - startPrice) * Number(levelValue);
}

function buildFibPrimitive(annotation, pdaType, isCurrent = false, isLinkedToSegment = false) {
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
      color: getHighlightColor(isCurrent, isLinkedToSegment, level.color || pdaType.color),
    }))
    .filter((level) => Number.isFinite(Number(level.price)));
  if (!levels.length) return null;

  return new FibPrimitive(chart.getChart(), chart.getSeries(), startTime, startPrice, endTime, endPrice, levels, {
    lineColor: getHighlightColor(isCurrent, isLinkedToSegment, annotation.color || pdaType.color),
    textColor: getHighlightColor(
      isCurrent,
      isLinkedToSegment,
      annotation.textColor || pdaType.textColor || '#d1d4dc'
    ),
    lineWidth: isCurrent || isLinkedToSegment ? 2 : 1,
    labelFont: getChartLabelFont(isCurrent || isLinkedToSegment ? 12 : 11),
    extendBars: getExtendBars(annotation, 0),
    showLabels: annotation.display?.showLabel ?? annotation.display?.showLabels ?? true,
    showTrendLine: annotation.display?.showTrendLine ?? false,
    trendLineColor: getHighlightColor(isCurrent, isLinkedToSegment, annotation.trendLineColor || '#787b86'),
    trendLineWidth: isCurrent || isLinkedToSegment ? 2 : 1,
  });
}

export function renderPdaAnnotations() {
  clearRenderedPrimitives();

  const chartInstance = chart.getChart();
  const series = chart.getSeries();
  if (!chartInstance || !series) return;

  const selected = getSelectedPda();
  const segmentPdaState = getSelectedSegmentPdaState();
  const drawingSetPdaIds = getActiveDrawingSetVisibility().activePdaIds;
  getAnnotations().forEach((annotation) => {
    if (annotation.display?.hidden) return;
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;
    const isCurrent = isCurrentAnnotation(annotation, selected);
    const isLinkedToSegment =
      segmentPdaState.highlightIds.has(annotation.id) || drawingSetPdaIds.has(annotation.id);
    if (segmentPdaState.hiddenIds.has(annotation.id)) return;
    if (segmentPdaState.isolate && !segmentPdaState.visibleIds.has(annotation.id)) return;
    if (!segmentPdaState.isolate && !drawingSetPdaIds.has(annotation.id) && !shouldRenderPda(annotation)) return;
    if (!canRenderPdaPriceProjection(annotation, 'NQ')) {
      buildTimeOnlyProjectionPrimitives(annotation, pdaType, isCurrent, isLinkedToSegment).forEach((primitive) => {
        chart.attachPrimitive(primitive);
        primitive.requestUpdate();
        renderedPrimitives.push(primitive);
      });
      return;
    }

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
      return;
    }

    if (pdaType.shape === 'fib-retracement') {
      const primitive = buildFibPrimitive(annotation, pdaType, isCurrent, isLinkedToSegment);
      if (!primitive) return;
      chart.attachPrimitive(primitive);
      primitive.requestUpdate();
      renderedPrimitives.push(primitive);
    }
  });
}

const renderPdaAnnotationsOnReplay = createRafThrottle(renderPdaAnnotations);

export function initPdaRenderer() {
  bus.on('pda:changed', renderPdaAnnotations);
  bus.on('pda:selected', renderPdaAnnotations);
  bus.on('pda:selection-cleared', renderPdaAnnotations);
  bus.on('segment:selected', renderPdaAnnotations);
  bus.on('segment:selection-cleared', renderPdaAnnotations);
  bus.on('segment:changed', renderPdaAnnotations);
  bus.on('segment-group:selected', renderPdaAnnotations);
  bus.on('segment-group:selection-cleared', renderPdaAnnotations);
  bus.on('segment-group:changed', renderPdaAnnotations);
  bus.on('drawing-set-focus:changed', renderPdaAnnotations);
  bus.on('display-mode:changed', renderPdaAnnotations);
  bus.on('display-preferences:changed', renderPdaAnnotations);
  bus.on('replay:changed', renderPdaAnnotationsOnReplay);
  bus.on('bars:loaded', renderPdaAnnotations);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
