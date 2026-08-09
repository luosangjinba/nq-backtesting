import { failAnnotation } from './annotation-error.js';

const FIELDS = Object.freeze([
  'fillColor', 'fillOpacity', 'schemaVersion', 'strokeColor', 'strokeWidth',
]);
const COLOR = /^#[0-9a-fA-F]{6}$/;

class DrawingPresentationValue {
  #snapshot;

  constructor(snapshot) {
    this.#snapshot = snapshot;
    Object.freeze(this);
  }

  read() { return this.#snapshot; }
}

function color(value, field) {
  if (typeof value !== 'string' || !COLOR.test(value)) {
    failAnnotation('DRAWING_PRESENTATION_COLOR_INVALID', `${field} must be #RRGGBB.`);
  }
  return value.toLowerCase();
}

/** Create the minimal typed Segment/Rectangle presentation value. */
export function createDrawingPresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...FIELDS].sort().join(',')) {
    failAnnotation('DRAWING_PRESENTATION_FIELDS_INVALID', 'Drawing Presentation fields must be exact.');
  }
  if (value.schemaVersion !== 1) {
    failAnnotation('DRAWING_PRESENTATION_SCHEMA_INVALID', 'Drawing Presentation schemaVersion must be 1.');
  }
  if (!Number.isFinite(value.strokeWidth) || value.strokeWidth < 1 || value.strokeWidth > 12) {
    failAnnotation('DRAWING_PRESENTATION_WIDTH_INVALID', 'Stroke width must be between 1 and 12.');
  }
  if (!Number.isFinite(value.fillOpacity) || value.fillOpacity < 0 || value.fillOpacity > 1) {
    failAnnotation('DRAWING_PRESENTATION_OPACITY_INVALID', 'Fill opacity must be between 0 and 1.');
  }
  return new DrawingPresentationValue(Object.freeze({
    fillColor: color(value.fillColor, 'Fill color'),
    fillOpacity: value.fillOpacity,
    schemaVersion: 1,
    strokeColor: color(value.strokeColor, 'Stroke color'),
    strokeWidth: value.strokeWidth,
  }));
}

/** Create the deterministic presentation used when a new Drawing chooses styling. */
export function createDefaultDrawingPresentation() {
  return createDrawingPresentation({
    fillColor: '#38bdf8',
    fillOpacity: 0.18,
    schemaVersion: 1,
    strokeColor: '#38bdf8',
    strokeWidth: 2,
  });
}

/** Read a branded Drawing Presentation as deeply immutable portable data. */
export function readDrawingPresentation(candidate) {
  if (!(candidate instanceof DrawingPresentationValue)) {
    failAnnotation('DRAWING_PRESENTATION_REQUIRED', 'A branded Drawing Presentation is required.');
  }
  return candidate.read();
}
