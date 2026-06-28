import { dateKeyFromTimestamp } from '../utils.js';

function addDateKeyFromTimestamp(keys, timestamp) {
  const dateKey = dateKeyFromTimestamp(timestamp);
  if (dateKey) keys.add(dateKey);
}

export function collectReviewObjectDateKeys({
  pdaAnnotations = [],
  marketSegments = [],
  segmentGroups = [],
  smtRecords = [],
  orderReviews = [],
  liveRecords = [],
  dailyTimeReviews = [],
} = {}) {
  const keys = new Set();

  pdaAnnotations.forEach((annotation) => {
    addDateKeyFromTimestamp(keys, annotation.canonicalTimestamp);
    addDateKeyFromTimestamp(keys, annotation.timestamp);
    addDateKeyFromTimestamp(keys, annotation.anchorTime);
    addDateKeyFromTimestamp(keys, annotation.start?.timestamp ?? annotation.start?.time);
    addDateKeyFromTimestamp(keys, annotation.end?.timestamp ?? annotation.end?.time);
    if (Array.isArray(annotation.points)) {
      annotation.points.forEach((point) => {
        addDateKeyFromTimestamp(keys, point?.canonicalTimestamp ?? point?.timestamp ?? point?.anchorTime ?? point?.time);
      });
    }
  });

  marketSegments.forEach((segment) => {
    addDateKeyFromTimestamp(keys, segment.start?.timestamp ?? segment.start?.time);
    addDateKeyFromTimestamp(keys, segment.end?.timestamp ?? segment.end?.time);
  });

  segmentGroups.forEach((group) => {
    if (Array.isArray(group.childSegmentIds)) {
      group.childSegmentIds.forEach((segmentId) => {
        const segment = marketSegments.find((candidate) => candidate.id === segmentId);
        addDateKeyFromTimestamp(keys, segment?.start?.timestamp ?? segment?.start?.time);
        addDateKeyFromTimestamp(keys, segment?.end?.timestamp ?? segment?.end?.time);
      });
    }
  });

  smtRecords.forEach((record) => {
    addDateKeyFromTimestamp(keys, record.leftTimestamp);
    addDateKeyFromTimestamp(keys, record.rightTimestamp);
    addDateKeyFromTimestamp(keys, record.timestamp);
    addDateKeyFromTimestamp(keys, record.fvgStartTimestamp);
    addDateKeyFromTimestamp(keys, record.fvgEndTimestamp);
  });

  orderReviews.forEach((order) => {
    addDateKeyFromTimestamp(keys, order.entryPlan?.entryTimestamp);
    addDateKeyFromTimestamp(keys, order.setupThesis?.primaryEventTimestamp);
    addDateKeyFromTimestamp(keys, order.resultReview?.exitTimestamp);
  });

  liveRecords.forEach((record) => {
    addDateKeyFromTimestamp(keys, record.anchor?.timestamp);
    addDateKeyFromTimestamp(keys, record.execution?.entry?.timestamp);
    addDateKeyFromTimestamp(keys, record.execution?.entry?.endTimestamp);
    addDateKeyFromTimestamp(keys, record.execution?.marketStructureShift?.timestamp);
    addDateKeyFromTimestamp(keys, record.execution?.marketStructureShift?.endTimestamp);
    addDateKeyFromTimestamp(keys, record.execution?.stopLoss?.timestamp);
    addDateKeyFromTimestamp(keys, record.execution?.stopLoss?.endTimestamp);
    if (Array.isArray(record.execution?.targets)) {
      record.execution.targets.forEach((target) => {
        addDateKeyFromTimestamp(keys, target.timestamp);
        addDateKeyFromTimestamp(keys, target.endTimestamp);
      });
    }
    addDateKeyFromTimestamp(keys, record.result?.exitTimestamp);
  });

  dailyTimeReviews.forEach((review) => {
    const date = String(review.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) keys.add(date);
  });

  return keys;
}
