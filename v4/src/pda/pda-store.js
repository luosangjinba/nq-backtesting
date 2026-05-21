// Session-scoped PDA annotations. No DB writes; everything is computed on use.

import * as bus from '../event-bus.js';
import { sortContextLabels } from './pda-context.js';

let annotations = [];
let objectiveVisibility = {
  ndog: false,
  nwog: false,
};

function emitChanged() {
  bus.emit('pda:changed', {
    annotations: getAnnotations(),
    objectiveVisibility: { ...objectiveVisibility },
  });
}

function priceKey(price) {
  return Number.isFinite(Number(price)) ? Number(price).toFixed(5) : 'na';
}

function getAnnotationIdentity(annotation) {
  if (Array.isArray(annotation.points) && annotation.points.length > 0) {
    const pointKey = annotation.points
      .map((point) =>
        [
          point.canonicalTimestamp ?? point.timestamp ?? point.anchorTime ?? 'na',
          priceKey(point.price),
        ].join('@')
      )
      .join('|');
    return [annotation.source || 'manual', annotation.type, 'point-set', pointKey].join(':');
  }

  const rangeKey =
    annotation.topPrice !== undefined || annotation.bottomPrice !== undefined
      ? [
          priceKey(annotation.topPrice ?? annotation.priceHigh),
          priceKey(annotation.bottomPrice ?? annotation.priceLow),
          annotation.startTime ?? 'na',
          annotation.endTime ?? 'na',
        ].join(':')
      : priceKey(annotation.price);

  return [
    annotation.source || 'manual',
    annotation.type,
    rangeKey,
    annotation.canonicalTimestamp ?? annotation.timestamp ?? annotation.anchorTime,
  ].join(':');
}

function mergeContexts(existingContexts = [], nextContexts = []) {
  return sortContextLabels(new Set([...existingContexts, ...nextContexts]));
}

function mergeAnnotation(existing, next) {
  return {
    ...existing,
    ...next,
    id: existing.id,
    contexts: mergeContexts(existing.contexts, next.contexts),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
}

export function addAnnotation(annotation) {
  const identity = getAnnotationIdentity(annotation);
  const existingIndex = annotations.findIndex(
    (existing) => getAnnotationIdentity(existing) === identity
  );

  if (existingIndex >= 0) {
    annotations = annotations.map((existing, index) =>
      index === existingIndex ? mergeAnnotation(existing, annotation) : existing
    );
  } else {
    annotations = [...annotations, { ...annotation, createdAt: Date.now(), updatedAt: Date.now() }];
  }
  emitChanged();
}

export function upsertAnnotationById(annotation) {
  const existingIndex = annotations.findIndex((existing) => existing.id === annotation.id);

  if (existingIndex >= 0) {
    annotations = annotations.map((existing, index) =>
      index === existingIndex ? mergeAnnotation(existing, annotation) : existing
    );
  } else {
    annotations = [...annotations, { ...annotation, createdAt: Date.now(), updatedAt: Date.now() }];
  }
  emitChanged();
}

export function removeAnnotation(id) {
  annotations = annotations.filter((annotation) => annotation.id !== id);
  emitChanged();
}

export function deleteAnnotation(id) {
  removeAnnotation(id);
}

export function clearAnnotations() {
  annotations = [];
  emitChanged();
}

export function getAnnotations() {
  return [...annotations];
}

export function getAnnotationById(id) {
  return annotations.find((annotation) => annotation.id === id) || null;
}

export function updateAnnotation(id, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch;
  let updated = null;

  annotations = annotations.map((annotation) => {
    if (annotation.id !== id) return annotation;
    updated = {
      ...annotation,
      ...safePatch,
      id: annotation.id,
      createdAt: annotation.createdAt,
      updatedAt: Date.now(),
    };
    return updated;
  });

  if (updated) emitChanged();
  return updated;
}

export function replaceAnnotation(id, nextAnnotation) {
  if (!nextAnnotation) return null;
  let replaced = null;

  annotations = annotations.map((annotation) => {
    if (annotation.id !== id) return annotation;
    replaced = {
      ...nextAnnotation,
      id: annotation.id,
      createdAt: annotation.createdAt,
      updatedAt: Date.now(),
    };
    return replaced;
  });

  if (replaced) emitChanged();
  return replaced;
}

export function setObjectivePdaVisible(type, visible) {
  objectiveVisibility = {
    ...objectiveVisibility,
    [type]: Boolean(visible),
  };
  emitChanged();
}

export function toggleObjectivePda(type) {
  setObjectivePdaVisible(type, !objectiveVisibility[type]);
}

export function isObjectivePdaVisible(type) {
  return Boolean(objectiveVisibility[type]);
}
