// Pixel-based hit testing for market segments.

import * as chart from '../chart/chart-manager.js';
import { getPrimaryChartContext } from '../chart/chart-context.js';
import { getIsolatedSegment, getSegments } from './segment-store.js';
import { getSegmentGroups } from './segment-group-store.js';
import { shouldRenderSegment, shouldRenderSegmentGroup } from '../display/display-mode.js';
import { getIsolateCompanionSegments } from './segment-isolate-view.js';
import { getSegmentPointRenderTime } from './segment-time.js';

const LINE_TOLERANCE_PX = 7;
const MARKER_TOLERANCE_PX = 8;

function getHitContext(context) {
  return context || getPrimaryChartContext();
}

function getHitTimeframe(context) {
  const timeframe = Number(context?.timeframe);
  return Number.isFinite(timeframe) ? timeframe : undefined;
}

function getTimeCoordinate(time, context) {
  if (time === undefined || time === null) return null;
  const activeContext = getHitContext(context);
  return activeContext.timeToCoordinate?.(time) ?? chart.timeToCoordinate(time);
}

function getPriceCoordinate(price, context) {
  if (price === undefined || price === null) return null;
  const activeContext = getHitContext(context);
  return activeContext.priceToCoordinate?.(Number(price)) ?? chart.priceToCoordinate(Number(price));
}

function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const projectionX = x1 + t * dx;
  const projectionY = y1 + t * dy;
  return Math.hypot(px - projectionX, py - projectionY);
}

function hitSegment(segment, x, y, context) {
  const timeframe = getHitTimeframe(context);
  const startX = getTimeCoordinate(getSegmentPointRenderTime(segment.start, timeframe), context);
  const startY = getPriceCoordinate(segment.start?.price, context);
  const endX = getTimeCoordinate(getSegmentPointRenderTime(segment.end, timeframe), context);
  const endY = getPriceCoordinate(segment.end?.price, context);

  if (startX === null || startY === null || endX === null || endY === null) return null;

  const markerDistance = Math.min(Math.hypot(x - startX, y - startY), Math.hypot(x - endX, y - endY));
  const lineDistance = distanceToLineSegment(x, y, startX, startY, endX, endY);
  const distance = Math.min(markerDistance, lineDistance);

  if (markerDistance > MARKER_TOLERANCE_PX && lineDistance > LINE_TOLERANCE_PX) return null;

  return {
    id: segment.id,
    type: 'market-segment',
    distance,
    reason: markerDistance <= MARKER_TOLERANCE_PX ? 'segment-marker' : 'segment-line',
  };
}

export function hitTestSegments({ x, y, context = null }) {
  const hits = [];
  const isolatedSegment = getIsolatedSegment();
  const isolateVisibleIds = new Set(
    isolatedSegment
      ? [isolatedSegment.id, ...getIsolateCompanionSegments(isolatedSegment).map((segment) => segment.id)]
      : []
  );

  getSegments().forEach((segment) => {
    if (segment.display?.hidden) return;
    if (isolatedSegment && !isolateVisibleIds.has(segment.id)) return;
    if (!isolatedSegment && !shouldRenderSegment(segment)) return;
    const hit = hitSegment(segment, x, y, context);
    if (hit) hits.push(hit);
  });

  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}

function getSortedGroupChildren(group) {
  const segmentMap = new Map(getSegments().map((segment) => [segment.id, segment]));
  return (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map((id) => segmentMap.get(id))
    .filter(Boolean)
    .sort((a, b) => Number(a.start?.timestamp ?? a.start?.time ?? 0) - Number(b.start?.timestamp ?? b.start?.time ?? 0));
}

function hitSegmentGroup(group, x, y, context) {
  const children = getSortedGroupChildren(group);
  if (children.length < 2) return null;

  const first = children[0];
  const last = children[children.length - 1];
  const timeframe = getHitTimeframe(context);
  const startX = getTimeCoordinate(getSegmentPointRenderTime(first.start, timeframe), context);
  const startY = getPriceCoordinate(first.start?.price, context);
  const endX = getTimeCoordinate(getSegmentPointRenderTime(last.end, timeframe), context);
  const endY = getPriceCoordinate(last.end?.price, context);

  if (startX === null || startY === null || endX === null || endY === null) return null;

  const markerDistance = Math.min(Math.hypot(x - startX, y - startY), Math.hypot(x - endX, y - endY));
  const lineDistance = distanceToLineSegment(x, y, startX, startY, endX, endY);
  const distance = Math.min(markerDistance, lineDistance);

  if (markerDistance > MARKER_TOLERANCE_PX && lineDistance > LINE_TOLERANCE_PX) return null;

  return {
    id: group.id,
    type: 'segment-group',
    distance,
    reason: markerDistance <= MARKER_TOLERANCE_PX ? 'segment-group-marker' : 'segment-group-line',
  };
}

export function hitTestSegmentGroups({ x, y, context = null }) {
  const hits = [];
  const isolatedSegment = getIsolatedSegment();
  const isolateVisibleIds = new Set(
    isolatedSegment
      ? [isolatedSegment.id, ...getIsolateCompanionSegments(isolatedSegment).map((segment) => segment.id)]
      : []
  );

  getSegmentGroups().forEach((group) => {
    if (group.display?.hidden) return;
    if (!isolatedSegment && !shouldRenderSegmentGroup(group)) return;
    if (isolatedSegment) {
      const children = getSortedGroupChildren(group);
      if (!children.some((segment) => isolateVisibleIds.has(segment.id))) return;
    }
    const hit = hitSegmentGroup(group, x, y, context);
    if (hit) hits.push(hit);
  });

  return hits.sort((a, b) => a.distance - b.distance)[0] || null;
}
