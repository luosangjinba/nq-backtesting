import { getSegmentById } from '../../segment/segment-store.js';

export function dateKeyFromTimestamp(timestamp) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const date = new Date(parsed * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function firstDateKeyFromValues(values = []) {
  for (const value of values) {
    const dateKey = dateKeyFromTimestamp(value);
    if (dateKey) return dateKey;
  }
  return '';
}

export function getCompositeTimestamp(group) {
  const childIds = Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [];
  const childSegments = childIds.map(getSegmentById).filter(Boolean);
  const terminal = childSegments[childSegments.length - 1];
  return terminal?.end?.timestamp ?? terminal?.end?.time ?? terminal?.start?.timestamp ?? terminal?.start?.time ?? null;
}

export function getOrderReviewCalendarDate(order = {}) {
  return dateKeyFromTimestamp(
    order.entryPlan?.entryTimestamp ??
      order.setupThesis?.primaryEventTimestamp ??
      order.resultReview?.exitTimestamp ??
      null
  );
}

export function getAnnotationCalendarDate(annotation = {}) {
  return firstDateKeyFromValues([
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.end?.timestamp,
    annotation.end?.time,
    ...(Array.isArray(annotation.points)
      ? annotation.points.map((point) => point?.canonicalTimestamp ?? point?.timestamp ?? point?.anchorTime ?? point?.time)
      : []),
  ]);
}

export function getSegmentCalendarDate(segment = {}) {
  return firstDateKeyFromValues([
    segment.end?.timestamp,
    segment.end?.time,
    segment.start?.timestamp,
    segment.start?.time,
  ]);
}

export function getCompositeCalendarDate(segmentGroup = {}) {
  return firstDateKeyFromValues([getCompositeTimestamp(segmentGroup)]);
}

export function getSmtCalendarDate(record = {}) {
  return firstDateKeyFromValues([
    record.leftTimestamp,
    record.fvgStartTimestamp,
    record.timestamp,
    record.rightTimestamp,
    record.fvgEndTimestamp,
  ]);
}
