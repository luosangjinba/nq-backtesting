// Readonly structure set list helpers for locating segments/composite moves.

import * as bus from '../event-bus.js';
import * as viewport from '../chart/viewport-controller.js';
import { getSegments } from './segment-store.js';
import { getSegmentGroups } from './segment-group-store.js';
import { getResponseDisplayMode } from './segment-isolate-view.js';

const activeDrawingSetKeys = new Set();

function getSetKey(type, id) {
  return `${type}:${id}`;
}

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

function emitFocusChanged() {
  bus.emit('drawing-set-focus:changed', getActiveDrawingSetVisibility());
}

export function isDrawingSetFocused(type, id) {
  return activeDrawingSetKeys.has(getSetKey(type, id));
}

export function getActiveDrawingSetKeys() {
  return new Set(activeDrawingSetKeys);
}

export function clearDrawingSetFocus() {
  if (!activeDrawingSetKeys.size) return;
  activeDrawingSetKeys.clear();
  emitFocusChanged();
}

export function getActiveDrawingSetVisibility() {
  const segments = getSegments();
  const segmentMap = new Map(segments.map((segment) => [segment.id, segment]));
  const groups = getSegmentGroups();
  const activeSegmentIds = new Set();
  const activeGroupIds = new Set();
  const activePdaIds = new Set();

  activeDrawingSetKeys.forEach((key) => {
    const separatorIndex = key.indexOf(':');
    const type = key.slice(0, separatorIndex);
    const id = key.slice(separatorIndex + 1);

    if (type === 'segment') {
      if (segmentMap.has(id)) activeSegmentIds.add(id);
      return;
    }

    if (type === 'composite') {
      const group = groups.find((entry) => entry.id === id);
      if (!group) return;
      activeGroupIds.add(group.id);
      (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
        .filter(Boolean)
        .forEach((segmentId) => activeSegmentIds.add(segmentId));
      if (group.targetSegmentId) activeSegmentIds.add(group.targetSegmentId);
    }
  });

  activeSegmentIds.forEach((segmentId) => {
    const segment = segmentMap.get(segmentId);
    const responses = Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : [];
    responses
      .filter((response) => getResponseDisplayMode(response) !== 'hidden')
      .map((response) => response.pdaId)
      .filter(Boolean)
      .forEach((pdaId) => activePdaIds.add(pdaId));
  });

  return {
    activeKeys: getActiveDrawingSetKeys(),
    activeSegmentIds,
    activeGroupIds,
    activePdaIds,
  };
}

export function locateDrawingSet(type, id) {
  const sets = getDrawingSets();
  const item = sets.find((entry) => entry.type === type && entry.id === id);
  if (!item) return null;

  const key = getSetKey(type, id);
  if (activeDrawingSetKeys.has(key)) {
    activeDrawingSetKeys.delete(key);
    emitFocusChanged();
    return item;
  }

  activeDrawingSetKeys.add(key);
  emitFocusChanged();
  viewport.locateTimestampRange(item.startTimestamp, item.endTimestamp);
  return item;
}

bus.on('bars:cleared', clearDrawingSetFocus);
