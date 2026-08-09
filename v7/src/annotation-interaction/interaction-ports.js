import { failInteraction } from './interaction-error.js';

function methods(candidate, names, code, label) {
  for (const name of names) {
    if (typeof candidate?.[name] !== 'function') {
      failInteraction(code, `${label} requires ${name}().`);
    }
  }
  return candidate;
}

/** Validate the pure Geometry operations used by one two-anchor controller. */
export function requireGeometryContract(candidate, createGeometryMethod = 'createSegmentGeometry') {
  return methods(candidate, [
    'createMarketAnchor', createGeometryMethod, 'readDrawingGeometry',
  ], 'ANNOTATION_INTERACTION_GEOMETRY_PORT_INVALID', 'Geometry contract');
}

/** Validate the Chart-owned exclusive normalized gesture port. */
export function requireInteractionPort(candidate) {
  return methods(candidate, ['acquire'], 'ANNOTATION_INTERACTION_CHART_PORT_INVALID', 'Chart interaction port');
}

/** Validate the Chart-owned transient Preview port without acquiring its owner. */
export function requirePreviewPort(candidate) {
  return methods(candidate, ['clear', 'replace'], 'ANNOTATION_INTERACTION_PREVIEW_PORT_INVALID', 'Preview port');
}

/** Validate the sole injected accepted generic-Drawing command. */
export function requireCommandPort(candidate) {
  return methods(candidate, ['createDrawing'], 'ANNOTATION_INTERACTION_COMMAND_PORT_INVALID', 'Command port');
}

/** Validate caller-owned factories that keep projection and identity brands outside the controller. */
export function requireFactory(candidate, code, label) {
  if (typeof candidate !== 'function') failInteraction(code, `${label} must be a function.`);
  return candidate;
}
