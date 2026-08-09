/**
 * Owner: annotation-geometry-domain.
 * Purpose: expose the complete R13.2 market-coordinate Geometry contract.
 * Inputs: exact anchors, trusted Geometry definitions, and immutable registry composition values.
 * Outputs: branded immutable anchors/Geometry plus frozen public metadata and registry surfaces.
 * Side effects: none; this optional module performs no I/O, rendering, persistence, or registration mutation.
 * Lifecycle: static pure API with no start, stop, or disposal phase.
 * Errors: malformed values throw AnnotationGeometryError with stable module codes.
 * Concurrency/cancellation: all operations are synchronous and deterministic.
 */
export { AnnotationGeometryError } from './geometry-error.js';
export {
  createGeometryRegistry,
  createInitialGeometryRegistry,
  restoreDrawingGeometry,
} from './geometry-registry.js';
export { createMarketAnchor, readMarketAnchor } from './market-anchor.js';
export { readDrawingGeometry } from './drawing-geometry.js';
export {
  createPointGeometry,
  createRectangleGeometry,
  createSegmentGeometry,
  defineGeometryType,
  GEOMETRY_TYPE_IDS,
  readGeometryTypeDefinition,
} from './geometry-type-definition.js';
