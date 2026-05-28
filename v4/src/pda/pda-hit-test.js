// Pixel-based PDA hit testing for chart click selection.

import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { getAnnotations } from './pda-store.js';
import { getBucketStart } from './pda-context.js';
import { getPdaType } from './pda-types.js';
import { getExtendBarsForTimeframe } from './pda-extend.js';
import { shouldRenderPda } from '../display/display-mode.js';
import { getIsolatedSegment } from '../segment/segment-store.js';
import {
  getIsolateCompanionSegments,
  getIsolatePreviousIncludePda,
  getResponseDisplayMode,
} from '../segment/segment-isolate-view.js';

const LINE_TOLERANCE_PX = 6;
const MARKER_TOLERANCE_PX = 8;
const DEFAULT_LINE_EXTEND_BARS = 8;
const MIN_RANGE_HIT_WIDTH_PX = 8;

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
  const rawTime = annotation[`${field}Timestamp`] ?? annotation[field];
  if (typeof rawTime === 'string') return rawTime;
  return mapTimestampToCurrentChartTime(rawTime) ?? annotation[fallbackField] ?? annotation.anchorTime;
}

function getTimeCoordinate(time) {
  if (time === undefined || time === null) return null;
  return chart.getChart()?.timeScale().timeToCoordinate(time) ?? null;
}

function getLogicalCoordinate(time) {
  const x = getTimeCoordinate(time);
  if (x === null) return null;
  return chart.getChart()?.timeScale().coordinateToLogical(x) ?? null;
}

function getCoordinateForLogical(logical) {
  if (logical === null || logical === undefined) return null;
  return chart.getChart()?.timeScale().logicalToCoordinate(logical) ?? null;
}

function getPriceCoordinate(price) {
  if (price === undefined || price === null) return null;
  return chart.priceToCoordinate(Number(price));
}

function getExtendBars(annotation, fallback = 0) {
  return getExtendBarsForTimeframe(annotation, fallback, store.getCurrentTimeframe());
}

function extendXByBars(x, extendBars) {
  if (x === null || extendBars <= 0) return x;
  const timeScale = chart.getChart()?.timeScale();
  const barSpacing = Number(timeScale?.options?.().barSpacing);
  const spacing = Number.isFinite(barSpacing) && barSpacing > 0 ? barSpacing : 6;
  return x + Number(extendBars) * spacing;
}

function between(value, a, b, tolerance = 0) {
  return value >= Math.min(a, b) - tolerance && value <= Math.max(a, b) + tolerance;
}

function distanceToSegmentX(x, from, to) {
  if (between(x, from, to)) return 0;
  return Math.min(Math.abs(x - from), Math.abs(x - to));
}

function hitLiquidity(annotation, x, y) {
  const anchorTime = getPointRenderTime(annotation);
  const anchorX = getTimeCoordinate(anchorTime);
  const lineY = getPriceCoordinate(annotation.price);
  const logical = getLogicalCoordinate(anchorTime);
  const extendBars = getExtendBars(annotation, DEFAULT_LINE_EXTEND_BARS);
  const endX = getCoordinateForLogical(logical === null ? null : logical + extendBars);

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

function hitRange(annotation, x, y) {
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime');
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime');
  const startX = getTimeCoordinate(startTime);
  let endX = getTimeCoordinate(endTime);
  const topY = getPriceCoordinate(annotation.topPrice ?? annotation.priceHigh);
  const bottomY = getPriceCoordinate(annotation.bottomPrice ?? annotation.priceLow);

  if (startX === null || endX === null || topY === null || bottomY === null) return null;
  endX = extendXByBars(endX, getExtendBars(annotation, 0));

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

function getPointSetRenderPoints(annotation) {
  if (!Array.isArray(annotation.points)) return [];
  return annotation.points
    .map((point) => ({
      x: getTimeCoordinate(
        mapTimestampToCurrentChartTime(point.canonicalTimestamp) ??
          mapTimestampToCurrentChartTime(point.timestamp) ??
          point.anchorTime
      ),
      price: point.price,
    }))
    .filter((point) => point.x !== null && point.price !== undefined);
}

function hitPointSet(annotation, x, y) {
  const points = getPointSetRenderPoints(annotation);
  if (points.length < 2) return null;

  const referencePrice =
    annotation.referencePrice ??
    annotation.price ??
    points.reduce((sum, point) => sum + Number(point.price), 0) / points.length;
  const referenceY = getPriceCoordinate(referencePrice);
  if (referenceY === null) return null;

  const xs = points.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const endX = extendXByBars(maxX, getExtendBars(annotation, 0));
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

function hitFib(annotation, x, y) {
  const startTime = getRangeRenderTime(annotation, 'startTime', 'startTime');
  const endTime = getRangeRenderTime(annotation, 'endTime', 'endTime');
  const startX = getTimeCoordinate(startTime);
  const rawEndX = getTimeCoordinate(endTime);
  if (startX === null || rawEndX === null) return null;
  const extendBars = getExtendBars(annotation, 0);
  const minX = Math.min(startX, rawEndX);
  const endX = extendXByBars(Math.max(startX, rawEndX), extendBars);
  if (endX === null) return null;

  const levels = Array.isArray(annotation.levels) ? annotation.levels : [];
  const visibleLevels = levels
    .filter((level) => level?.visible !== false && Number.isFinite(Number(level.value)))
    .map((level) => ({
      value: level.value,
      y: getPriceCoordinate(getFibLevelPrice(annotation, level.value)),
    }))
    .filter((level) => level.y !== null);

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

export function hitTestPdaAnnotations({ x, y }) {
  const hits = [];
  const isolatedSegment = getIsolatedSegment();
  const isolatedVisiblePdaIds = new Set();
  if (isolatedSegment) {
    const responses = Array.isArray(isolatedSegment.pdaResponses) ? isolatedSegment.pdaResponses : [];
    responses
      .filter((response) => getResponseDisplayMode(response) !== 'hidden')
      .forEach((response) => {
        if (response.pdaId) isolatedVisiblePdaIds.add(response.pdaId);
      });
    if (getIsolatePreviousIncludePda(isolatedSegment)) {
      getIsolateCompanionSegments(isolatedSegment).forEach((segment) => {
        const companionResponses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
        companionResponses
          .filter((response) => getResponseDisplayMode(response) !== 'hidden')
          .forEach((response) => {
            if (response.pdaId) isolatedVisiblePdaIds.add(response.pdaId);
          });
      });
    }
  }

  getAnnotations().forEach((annotation) => {
    if (annotation.draft) return;
    if (isolatedSegment && !isolatedVisiblePdaIds.has(annotation.id)) return;
    if (!isolatedSegment && !shouldRenderPda(annotation)) return;
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;

    let hit = null;
    if (pdaType.shape === 'liquidity-line') hit = hitLiquidity(annotation, x, y);
    if (pdaType.shape === 'range') hit = hitRange(annotation, x, y);
    if (pdaType.shape === 'point-set') hit = hitPointSet(annotation, x, y);
    if (pdaType.shape === 'fib-retracement') hit = hitFib(annotation, x, y);
    if (hit) hits.push(hit);
  });

  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}
