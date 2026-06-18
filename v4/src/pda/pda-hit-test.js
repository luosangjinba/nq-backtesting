// Pixel-based PDA hit testing for chart click selection.

import * as chart from '../chart/chart-manager.js';
import { getPrimaryChartContext } from '../chart/chart-context.js';
import { mapTimestampToChartTime } from '../chart/time-projection.js';
import * as store from '../data/bar-store.js';
import { getAnnotations } from './pda-store.js';
import { getPdaType } from './pda-types.js';
import { getVisibleFibLevels } from './fib-levels.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { canRenderPdaPriceProjection, getPdaProjectionTimestamps } from './pda-projection.js';
import { getStructureOverlayVisibility } from '../display/overlay-visibility.js';
import { getSegments } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';

const LINE_TOLERANCE_PX = 6;
const MARKER_TOLERANCE_PX = 8;
const DEFAULT_LINE_EXTEND_BARS = 8;
const MIN_RANGE_HIT_WIDTH_PX = 8;
const TIME_ONLY_TOLERANCE_PX = 8;

function getHitContext(context) {
  return context || getPrimaryChartContext();
}

function getHitTimeframe(context) {
  return Number(context?.timeframe) || store.getCurrentTimeframe();
}

function mapTimestampToCurrentChartTime(timestamp, context) {
  if (timestamp === undefined || timestamp === null) return null;
  if (!Number.isFinite(Number(timestamp))) return null;
  const timeframe = getHitTimeframe(context);
  const bars = getHitContext(context)?.getDisplayBars?.() || store.getDisplayBars();
  return mapTimestampToChartTime(Number(timestamp), timeframe, bars);
}

function getPointRenderTime(annotation, context) {
  return (
    mapTimestampToCurrentChartTime(annotation.canonicalTimestamp, context) ??
    mapTimestampToCurrentChartTime(annotation.timestamp, context) ??
    annotation.anchorTime
  );
}

function getRangeRenderTime(annotation, field, fallbackField, context) {
  const rawTime = annotation[`${field}Timestamp`] ?? annotation[field];
  if (typeof rawTime === 'string') return rawTime;
  return mapTimestampToCurrentChartTime(rawTime, context) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function getTimeCoordinate(time, context) {
  if (time === undefined || time === null) return null;
  const activeContext = getHitContext(context);
  return activeContext.getChart?.()?.timeScale().timeToCoordinate(time) ?? null;
}

function getLogicalCoordinate(time, context) {
  const activeContext = getHitContext(context);
  const x = getTimeCoordinate(time, activeContext);
  if (x === null) return null;
  return activeContext.getChart?.()?.timeScale().coordinateToLogical(x) ?? null;
}

function getCoordinateForLogical(logical, context) {
  if (logical === null || logical === undefined) return null;
  return getHitContext(context).getChart?.()?.timeScale().logicalToCoordinate(logical) ?? null;
}

function getPriceCoordinate(price, context) {
  if (price === undefined || price === null) return null;
  const activeContext = getHitContext(context);
  return activeContext.priceToCoordinate?.(Number(price)) ?? chart.priceToCoordinate(Number(price));
}

function hitTimeOnlyProjection(annotation, x, context) {
  const candidates = getPdaProjectionTimestamps(annotation)
    .map((timestamp) => mapTimestampToCurrentChartTime(timestamp, context))
    .map((time) => getTimeCoordinate(time, context))
    .filter((coordinate) => coordinate !== null && coordinate !== undefined)
    .map((coordinate) => ({ coordinate, distance: Math.abs(x - coordinate) }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0];
  if (!nearest || nearest.distance > TIME_ONLY_TOLERANCE_PX) return null;
  return {
    id: annotation.id,
    type: annotation.type,
    distance: nearest.distance,
    reason: 'pda-time-projection',
  };
}

function getExtendBars(annotation, fallback = 0, context) {
  return getExtendBarsForTimeframe(annotation, fallback, getHitTimeframe(context));
}

function extendXByBars(x, extendBars, context) {
  if (x === null || extendBars <= 0) return x;
  const timeScale = getHitContext(context).getChart?.()?.timeScale() ?? chart.getChart()?.timeScale();
  const barSpacing = Number(timeScale?.options?.().barSpacing);
  const spacing = Number.isFinite(barSpacing) && barSpacing > 0 ? barSpacing : 6;
  return x + Number(extendBars) * spacing;
}

function between(value, a, b, tolerance = 0) {
  return value >= Math.min(a, b) - tolerance && value <= Math.max(a, b) + tolerance;
}

function distanceToSegment(x, y, x1, y1, x2, y2) {
  const dx = Number(x2) - Number(x1);
  const dy = Number(y2) - Number(y1);
  const lengthSq = dx * dx + dy * dy;
  if (!Number.isFinite(lengthSq) || lengthSq <= 0) {
    return Math.hypot(Number(x) - Number(x1), Number(y) - Number(y1));
  }
  const t = Math.max(0, Math.min(1, ((Number(x) - Number(x1)) * dx + (Number(y) - Number(y1)) * dy) / lengthSq));
  const projectedX = Number(x1) + t * dx;
  const projectedY = Number(y1) + t * dy;
  return Math.hypot(Number(x) - projectedX, Number(y) - projectedY);
}

function distanceToSegmentX(x, from, to) {
  if (between(x, from, to)) return 0;
  return Math.min(Math.abs(x - from), Math.abs(x - to));
}

function hitLiquidity(annotation, x, y, context) {
  const anchorTime = getPointRenderTime(annotation, context);
  const anchorX = getTimeCoordinate(anchorTime, context);
  const lineY = getPriceCoordinate(annotation.price, context);
  const logical = getLogicalCoordinate(anchorTime, context);
  const extendBars = getExtendBars(annotation, DEFAULT_LINE_EXTEND_BARS, context);
  const endX = getCoordinateForLogical(logical === null ? null : logical + extendBars, context);

  if (anchorX === null || lineY === null || endX === null) return null;

  const yDistance = Math.abs(y - lineY);
  if (yDistance > LINE_TOLERANCE_PX) return null;

  const xDistance = distanceToSegmentX(x, anchorX, endX);
  if (xDistance > LINE_TOLERANCE_PX) return null;

  return {
    id: annotation.id,
    type: annotation.type,
    distance: yDistance + xDistance,
    reason: 'liquidity-line',
  };
}

function hitRange(annotation, x, y, context) {
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime', context);
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime', context);
  const startX = getTimeCoordinate(startTime, context);
  let endX = getTimeCoordinate(endTime, context);
  const topY = getPriceCoordinate(annotation.topPrice ?? annotation.priceHigh, context);
  const bottomY = getPriceCoordinate(annotation.bottomPrice ?? annotation.priceLow, context);

  if (startX === null || endX === null || topY === null || bottomY === null) return null;
  endX = extendXByBars(endX, getExtendBars(annotation, 0, context), context);

  let hitStartX = startX;
  let hitEndX = endX;
  const width = Math.abs(hitEndX - hitStartX);
  if (width < MIN_RANGE_HIT_WIDTH_PX) {
    const center = (hitStartX + hitEndX) / 2;
    hitStartX = center - MIN_RANGE_HIT_WIDTH_PX / 2;
    hitEndX = center + MIN_RANGE_HIT_WIDTH_PX / 2;
  }

  if (!between(x, hitStartX, hitEndX) || !between(y, topY, bottomY)) return null;

  const centerX = (hitStartX + hitEndX) / 2;
  const centerY = (topY + bottomY) / 2;
  return {
    id: annotation.id,
    type: annotation.type,
    distance: Math.abs(x - centerX) + Math.abs(y - centerY),
    reason: 'range',
  };
}

function getPointSetRenderPoints(annotation, context) {
  if (!Array.isArray(annotation.points)) return [];
  return annotation.points
    .map((point) => ({
      x: getTimeCoordinate(
        mapTimestampToCurrentChartTime(point.canonicalTimestamp, context) ??
          mapTimestampToCurrentChartTime(point.timestamp, context) ??
          point.anchorTime,
        context
      ),
      price: point.price,
    }))
    .filter((point) => point.x !== null && point.price !== undefined);
}

function hitPointSet(annotation, x, y, context) {
  const points = getPointSetRenderPoints(annotation, context);
  if (points.length < 2) return null;

  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;
  const referenceY = getPriceCoordinate(referencePrice, context);
  if (referenceY === null) return null;

  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const endX = extendXByBars(maxX, getExtendBars(annotation, 0, context), context);
  const lineHit =
    Math.abs(y - referenceY) <= LINE_TOLERANCE_PX && between(x, minX, endX, LINE_TOLERANCE_PX);

  const markerOffset = 8;
  const markerY = annotation.markerPosition === 'below' ? referenceY + markerOffset : referenceY - markerOffset;
  const markerDistance = Math.min(
    ...points.map((point) => Math.hypot(x - point.x, y - markerY))
  );

  if (!lineHit && markerDistance > MARKER_TOLERANCE_PX) return null;

  return {
    id: annotation.id,
    type: annotation.type,
    distance: lineHit ? Math.abs(y - referenceY) : markerDistance,
    reason: lineHit ? 'point-set-line' : 'point-set-marker',
  };
}

function getFibLevelPrice(annotation, levelValue) {
  const startPrice = Number(annotation.start?.price);
  const endPrice = Number(annotation.end?.price);
  if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) return null;
  return endPrice - (endPrice - startPrice) * Number(levelValue);
}

function hitFib(annotation, x, y, context) {
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime', context);
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime', context);
  const startX = getTimeCoordinate(startTime, context);
  const rawEndX = getTimeCoordinate(endTime, context);
  const startY = getPriceCoordinate(annotation.start?.price, context);
  const endY = getPriceCoordinate(annotation.end?.price, context);
  if (startX === null || rawEndX === null || startY === null || endY === null) return null;
  const extendBars = getExtendBars(annotation, 0, context);
  const minX = Math.min(startX, rawEndX);
  const endX = extendXByBars(Math.max(startX, rawEndX), extendBars, context);
  if (endX === null) return null;

  const visibleLevels = getVisibleFibLevels(annotation.levels)
    .map((level) => ({
      value: level.value,
      y: getPriceCoordinate(getFibLevelPrice(annotation, level.value), context),
    }))
    .filter((level) => level.y !== null);

  const endpointDistance = Math.min(
    Math.hypot(x - startX, y - startY),
    Math.hypot(x - rawEndX, y - endY)
  );
  const trendDistance = distanceToSegment(x, y, startX, startY, rawEndX, endY);
  if (endpointDistance <= MARKER_TOLERANCE_PX || trendDistance <= LINE_TOLERANCE_PX) {
    return {
      id: annotation.id,
      type: annotation.type,
      distance: Math.min(endpointDistance, trendDistance),
      reason: endpointDistance <= MARKER_TOLERANCE_PX ? 'fib-endpoint' : 'fib-trend',
    };
  }

  if (!visibleLevels.length || !between(x, minX, endX, LINE_TOLERANCE_PX)) return null;

  const nearest = visibleLevels
    .map((level) => ({ ...level, distance: Math.abs(y - level.y) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (!nearest || nearest.distance > LINE_TOLERANCE_PX) return null;

  return {
    id: annotation.id,
    type: annotation.type,
    distance: nearest.distance,
    reason: 'fib-level',
  };
}

export function hitTestPdaAnnotations({ x, y, context = null }) {
  const activeContext = getHitContext(context);
  const hits = [];
  const annotations = getAnnotations();
  const visibility = getStructureOverlayVisibility({
    annotations,
    segments: getSegments(),
    groups: getSegmentGroups(),
  });

  annotations.forEach((annotation) => {
    if (annotation.draft) return;
    if (!visibility.visiblePdaIds.has(annotation.id)) return;
    if (visibility.hiddenPdaIds.has(annotation.id)) return;
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;

    let hit = null;
    if (!canRenderPdaPriceProjection(annotation, activeContext)) {
      hit = hitTimeOnlyProjection(annotation, x, activeContext);
    } else if (pdaType.shape === 'liquidity-line') hit = hitLiquidity(annotation, x, y, activeContext);
    else if (pdaType.shape === 'range') hit = hitRange(annotation, x, y, activeContext);
    else if (pdaType.shape === 'point-set') hit = hitPointSet(annotation, x, y, activeContext);
    else if (pdaType.shape === 'fib-retracement') hit = hitFib(annotation, x, y, activeContext);
    if (hit) hits.push(hit);
  });

  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}
