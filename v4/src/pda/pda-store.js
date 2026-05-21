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

export function removeAnnotation(id) {
  annotations = annotations.filter((annotation) => annotation.id !== id);
  emitChanged();
}

export function clearAnnotations() {
  annotations = [];
  emitChanged();
}

export function getAnnotations() {
  return [...annotations];
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
