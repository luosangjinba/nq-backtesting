import { failGeometry } from './geometry-error.js';
import { normalizePortableGeometryPayload } from './portable-value.js';

class DrawingGeometryValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

/** Create one branded Geometry envelope from already selected trusted definition policy. */
export function createDrawingGeometryValue({ payload, typeId, typeVersion }) {
  return new DrawingGeometryValue({
    payload: normalizePortableGeometryPayload(payload),
    schemaVersion: 1,
    typeId,
    typeVersion,
  });
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: expose the portable Geometry envelope without definition or vendor handles.
 * Inputs/outputs: branded Drawing Geometry; deeply frozen plain envelope.
 * Side effects/lifecycle: none; reading never registers or projects Geometry.
 * Errors: AnnotationGeometryError for structural lookalikes.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function readDrawingGeometry(candidate) {
  if (!(candidate instanceof DrawingGeometryValue)) {
    failGeometry('DRAWING_GEOMETRY_REQUIRED', 'A branded Drawing Geometry is required.');
  }
  return candidate.read();
}
