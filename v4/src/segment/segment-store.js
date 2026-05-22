// Session-scoped market segments. First pass is manual 1H swing-to-swing legs.

import * as bus from '../event-bus.js';

let segments = [];

function emitChanged() {
  bus.emit('segment:changed', {
    segments: getSegments(),
  });
}

function getSegmentIdentity(segment) {
  return [
    segment.source || 'manual',
    segment.timeframe || '1H',
    segment.start?.timestamp ?? segment.start?.time ?? 'na',
    segment.end?.timestamp ?? segment.end?.time ?? 'na',
    segment.start?.price ?? 'na',
    segment.end?.price ?? 'na',
  ].join(':');
}

function mergeSegment(existing, next) {
  return {
    ...existing,
    ...next,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
}

export function addSegment(segment) {
  const identity = getSegmentIdentity(segment);
  const existingIndex = segments.findIndex((existing) => getSegmentIdentity(existing) === identity);

  if (existingIndex >= 0) {
    segments = segments.map((existing, index) =>
      index === existingIndex ? mergeSegment(existing, segment) : existing
    );
  } else {
    segments = [...segments, { ...segment, createdAt: Date.now(), updatedAt: Date.now() }];
  }

  emitChanged();
}

export function clearSegments() {
  segments = [];
  emitChanged();
}

export function updateSegment(id, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch;
  let updated = null;

  segments = segments.map((segment) => {
    if (segment.id !== id) return segment;
    updated = {
      ...segment,
      ...safePatch,
      id: segment.id,
      createdAt: segment.createdAt,
      updatedAt: Date.now(),
    };
    return updated;
  });

  if (updated) emitChanged();
  return updated;
}

export function getSegments() {
  return [...segments];
}

export function getSegmentById(id) {
  return segments.find((segment) => segment.id === id) || null;
}
