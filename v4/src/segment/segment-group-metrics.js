import { getSegmentById } from './segment-store.js';

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getTimestamp(segment) {
  return asNumber(segment?.start?.timestamp ?? segment?.start?.time) ?? 0;
}

function getRangePoints(segment) {
  const start = asNumber(segment?.start?.price);
  const end = asNumber(segment?.end?.price);
  return start === null || end === null ? null : Math.abs(end - start);
}

function getDirection(segment) {
  if (segment?.direction === 'up' || segment?.direction === 'down') return segment.direction;
  const start = asNumber(segment?.start?.price);
  const end = asNumber(segment?.end?.price);
  if (start === null || end === null || start === end) return 'flat';
  return end > start ? 'up' : 'down';
}

function sortChildren(group) {
  return (Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [])
    .map(getSegmentById)
    .filter(Boolean)
    .sort((a, b) => getTimestamp(a) - getTimestamp(b));
}

function tookTargetExtreme(group, terminalSegment) {
  const target = getSegmentById(group?.targetSegmentId);
  const terminalEnd = asNumber(terminalSegment?.end?.price);
  if (!target || terminalEnd === null) return null;

  const direction = group.direction || getDirection(terminalSegment);
  const targetStart = asNumber(target.start?.price);
  if (targetStart === null) return null;
  if (direction === 'up') return terminalEnd > targetStart;
  if (direction === 'down') return terminalEnd < targetStart;
  return null;
}

export function computeSegmentGroupMetrics(group) {
  const children = sortChildren(group);
  const first = children[0];
  const last = children[children.length - 1];
  const startPrice = asNumber(first?.start?.price);
  const endPrice = asNumber(last?.end?.price);
  const netRangePoints = startPrice === null || endPrice === null ? null : Math.abs(endPrice - startPrice);
  const totalPathPoints = children.reduce((sum, segment) => sum + (getRangePoints(segment) ?? 0), 0);
  const direction = group?.direction || getDirection(last);
  const counterRanges = children
    .filter((segment) => getDirection(segment) !== direction)
    .map(getRangePoints)
    .filter((value) => value !== null);
  const maxCounterRangePoints = counterRanges.length ? Math.max(...counterRanges) : 0;
  const previousDirectionalRange = children
    .filter((segment) => getDirection(segment) === direction)
    .map(getRangePoints)
    .find((value) => value !== null && value > 0);

  return {
    childCount: children.length,
    startSegmentId: first?.id || null,
    terminalSegmentId: last?.id || null,
    netRangePoints,
    totalPathPoints,
    efficiency: totalPathPoints ? netRangePoints / totalPathPoints : null,
    maxCounterRangePoints,
    maxPullbackDepthRatio: previousDirectionalRange ? maxCounterRangePoints / previousDirectionalRange : null,
    terminalTookTargetExtreme: tookTargetExtreme(group, last),
  };
}
