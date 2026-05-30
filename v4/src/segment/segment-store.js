// Session-scoped market segments. First pass is manual 1H swing-to-swing legs.

import * as bus from '../event-bus.js';

let segments = [];

function emitChanged() {
  bus.emit('segment:changed', {
    segments: getSegments(),
  });
}

export function getSegmentIdentity(segment) {
  return [
    segment.source || 'manual',
    segment.sourceChartId || 'primary',
    segment.instrument || segment.sourceInstrument || 'NQ',
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

function resetSegmentDisplay(segment) {
  return {
    ...segment,
    display: {
      ...(segment.display || {}),
      isolateDisplayMode: 'highlight',
    },
    pdaResponses: Array.isArray(segment.pdaResponses)
      ? segment.pdaResponses.map((response) => ({
          ...response,
          displayMode: 'highlight',
          selected: true,
        }))
      : [],
    updatedAt: Date.now(),
  };
}

export function resetAllSegmentDisplayModes() {
  segments = segments.map(resetSegmentDisplay);
  emitChanged();
}

export function addSegment(segment) {
  if (!getIsolatedSegment()) resetAllSegmentDisplayModes();
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

export function deleteSegment(id) {
  segments = segments.filter((segment) => segment.id !== id);
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

export function setSegmentIsolated(id, isolate) {
  let updated = null;

  segments = segments.map((segment) => {
    const nextIsolate = segment.id === id ? Boolean(isolate) : false;
    const nextSegment = {
      ...segment,
      display: {
        ...(segment.display || {}),
        isolate: nextIsolate,
      },
      updatedAt: segment.id === id ? Date.now() : segment.updatedAt,
    };
    if (segment.id === id) updated = nextSegment;
    return nextSegment;
  });

  if (updated) emitChanged();
  return updated;
}

export function getIsolatedSegment() {
  return segments.find((segment) => segment.display?.isolate) || null;
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
    displayMode: pdaResponse.displayMode || (pdaResponse.selected === false ? 'normal' : 'highlight'),
    selected: pdaResponse.selected ?? true,
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

export function updatePdaResponse(segmentId, pdaId, patch = {}) {
  const segment = getSegmentById(segmentId);
  if (!segment || !pdaId) return null;

  const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
  const nextResponses = responses.map((response) =>
    response.pdaId === pdaId ? { ...response, ...patch, pdaId: response.pdaId } : response
  );
  return updateSegment(segmentId, { pdaResponses: nextResponses });
}

export function removePdaResponse(segmentId, pdaId) {
  const segment = getSegmentById(segmentId);
  if (!segment || !pdaId) return null;

  const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
  return updateSegment(segmentId, {
    pdaResponses: responses.filter((response) => response.pdaId !== pdaId),
  });
}

export function clearAllPdaResponses() {
  let changed = false;
  segments = segments.map((segment) => {
    const responses = Array.isArray(segment.pdaResponses) ? segment.pdaResponses : [];
    if (!responses.length) return segment;
    changed = true;
    return {
      ...segment,
      pdaResponses: [],
      updatedAt: Date.now(),
    };
  });

  if (changed) emitChanged();
}

export function getSegments() {
  return [...segments];
}

export function getSegmentById(id) {
  return segments.find((segment) => segment.id === id) || null;
}
