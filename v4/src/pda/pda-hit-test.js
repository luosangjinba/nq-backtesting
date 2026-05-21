// Pixel-based PDA hit testing for chart click selection.

import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { getAnnotations } from './pda-store.js';
import { getBucketStart } from './pda-context.js';
import { getPdaType } from './pda-types.js';

const LINE_TOLERANCE_PX = 6;
const MARKER_TOLERANCE_PX = 8;
const DEFAULT_LINE_EXTEND_BARS = 8;

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
  const extendBars = annotation.extendBars ?? annotation.display?.extendBars ?? DEFAULT_LINE_EXTEND_BARS;
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
  const endX = getTimeCoordinate(endTime);
  const topY = getPriceCoordinate(annotation.topPrice ?? annotation.priceHigh);
  const bottomY = getPriceCoordinate(annotation.bottomPrice ?? annotation.priceLow);

  if (startX === null || endX === null || topY === null || bottomY === null) return null;
  if (!between(x, startX, endX) || !between(y, topY, bottomY)) return null;

  const centerX = (startX + endX) / 2;
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
  const lineHit =
    Math.abs(y - referenceY) <= LINE_TOLERANCE_PX && between(x, minX, maxX, LINE_TOLERANCE_PX);

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

export function hitTestPdaAnnotations({ x, y }) {
  const hits = [];

  getAnnotations().forEach((annotation) => {
    if (annotation.draft) return;
    const pdaType = getPdaType(annotation.type);
    if (!pdaType) return;

    let hit = null;
    if (pdaType.shape === 'liquidity-line') hit = hitLiquidity(annotation, x, y);
    if (pdaType.shape === 'range') hit = hitRange(annotation, x, y);
    if (pdaType.shape === 'point-set') hit = hitPointSet(annotation, x, y);
    if (hit) hits.push(hit);
  });

  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}
