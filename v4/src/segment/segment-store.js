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

export function loadSegments(nextSegments = []) {
  segments = Array.isArray(nextSegments) ? [...nextSegments] : [];
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

export function linkPdaResponse(segmentId, pdaResponse) {
  if (!segmentId || !pdaResponse?.pdaId) return null;
  const segment = getSegmentById(segmentId);
  if (!segment) return null;

  const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
  const nextResponse = {
    pdaId: pdaResponse.pdaId,
    pdaType: pdaResponse.pdaType || 'unknown',
    relation: pdaResponse.relation || 'approached',
    note: pdaResponse.note || '',
    linkedAt: Date.now(),
  };
  const existingIndex = responses.findIndex((response) => response.pdaId === nextResponse.pdaId);
  const nextResponses =
    existingIndex >= 0
      ? responses.map((response, index) =>
          index === existingIndex ? { ...response, ...nextResponse } : response
        )
      : [...responses, nextResponse];

  return updateSegment(segmentId, { pdaResponses: nextResponses });
}

export function getSegments() {
  return [...segments];
}

export function getSegmentById(id) {
  return segments.find((segment) => segment.id === id) || null;
}
