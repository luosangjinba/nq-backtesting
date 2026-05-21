// Session-scoped PDA annotations. No DB writes; everything is computed on use.

import * as bus from '../event-bus.js';

let annotations = [];
let objectiveVisibility = {
  ndow: false,
  nwog: false,
};

function emitChanged() {
  bus.emit('pda:changed', {
    annotations: getAnnotations(),
    objectiveVisibility: { ...objectiveVisibility },
  });
}

export function addAnnotation(annotation) {
  annotations = [...annotations, annotation];
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
