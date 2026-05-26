// Readonly structure set list helpers for locating segments/composite moves.

import * as viewport from '../chart/viewport-controller.js';
import { getSegments } from './segment-store.js';
import { getSegmentGroups } from './segment-group-store.js';
import { selectSegment, selectSegmentGroup } from './segment-selection.js';

function getPointTimestamp(point) {
  const occurrence = Number(point?.occurrenceTimestamp);
  if (Number.isFinite(occurrence)) return occurrence;
  const timestamp = Number(point?.timestamp ?? point?.time);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getSegmentTimeRange(segment) {
  const start = getPointTimestamp(segment?.start);
  const end = getPointTimestamp(segment?.end);
  if (start === null || end === null) return null;
  return {
    startTimestamp: Math.min(start, end),
    endTimestamp: Math.max(start, end),
  };
}

function getSegmentLabel(segment) {
  const direction = segment.direction === 'down' ? 'DOWN' : segment.direction === 'up' ? 'UP' : 'FLAT';
  return `${segment.timeframe || '1H'} ${direction} Segment`;
}

function getSortedGroupChildren(group, segmentMap) {
  return (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map((id) => segmentMap.get(id))
    .filter(Boolean)
    .sort((a, b) => Number(a.start?.timestamp ?? a.start?.time ?? 0) - Number(b.start?.timestamp ?? b.start?.time ?? 0));
}

function getCompositeRange(group, segmentMap) {
  const children = getSortedGroupChildren(group, segmentMap);
  if (children.length < 2) return null;
  const firstRange = getSegmentTimeRange(children[0]);
  const lastRange = getSegmentTimeRange(children[children.length - 1]);
  if (!firstRange || !lastRange) return null;
  return {
    startTimestamp: firstRange.startTimestamp,
    endTimestamp: lastRange.endTimestamp,
  };
}

function formatDateTime(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '';
  const dt = new Date(Number(timestamp) * 1000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const min = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function getDrawingSets() {
  const segments = getSegments();
  const segmentMap = new Map(segments.map((segment) => [segment.id, segment]));
  const segmentItems = segments
    .map((segment) => {
      const range = getSegmentTimeRange(segment);
      if (!range) return null;
      return {
        id: segment.id,
        type: 'segment',
        label: getSegmentLabel(segment),
        detail: `${formatDateTime(range.startTimestamp)} - ${formatDateTime(range.endTimestamp)}`,
        ...range,
      };
    })
    .filter(Boolean);

  const groupItems = getSegmentGroups()
    .map((group) => {
      const range = getCompositeRange(group, segmentMap);
      if (!range) return null;
      const childCount = Array.isArray(group.childSegmentIds) ? group.childSegmentIds.length : 0;
      const direction = group.direction === 'down' ? 'DOWN' : group.direction === 'up' ? 'UP' : 'FLAT';
      return {
        id: group.id,
        type: 'composite',
        label: `Composite ${direction} (${childCount})`,
        detail: `${formatDateTime(range.startTimestamp)} - ${formatDateTime(range.endTimestamp)}`,
        ...range,
      };
    })
    .filter(Boolean);

  return [...segmentItems, ...groupItems].sort((a, b) => b.endTimestamp - a.endTimestamp);
}

export function locateDrawingSet(type, id) {
  const sets = getDrawingSets();
  const item = sets.find((entry) => entry.type === type && entry.id === id);
  if (!item) return null;

  if (type === 'segment') {
    selectSegment(id);
  } else if (type === 'composite') {
    selectSegmentGroup(id);
  }

  viewport.locateTimestampRange(item.startTimestamp, item.endTimestamp);
  return item;
}
