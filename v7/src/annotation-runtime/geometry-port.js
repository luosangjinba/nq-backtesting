import { failAnnotation } from './annotation-error.js';

const ENVELOPE_FIELDS = Object.freeze(['payload', 'schemaVersion', 'typeId', 'typeVersion']);

function deepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return true;
  if (!Object.isFrozen(value)) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  return Reflect.ownKeys(value).every((key) => deepFrozen(value[key], seen));
}

/** Normalize the independently removable Geometry public port. */
export function normalizeGeometryContract(candidate) {
  if (candidate === null || candidate === undefined) return null;
  if (typeof candidate !== 'object' || typeof candidate.readDrawingGeometry !== 'function') {
    failAnnotation(
      'ANNOTATION_GEOMETRY_CONTRACT_INVALID',
      'Geometry capability must expose readDrawingGeometry().',
    );
  }
  return Object.freeze({ readDrawingGeometry: candidate.readDrawingGeometry });
}

/** Read one branded Geometry only through the injected public contract. */
export function readAcceptedGeometry(contract, candidate) {
  if (contract === null) {
    failAnnotation(
      'ANNOTATION_GEOMETRY_UNAVAILABLE',
      'Annotation Geometry capability is not installed.',
    );
  }
  let geometry;
  try {
    geometry = contract.readDrawingGeometry(candidate);
  } catch (cause) {
    failAnnotation('ANNOTATION_GEOMETRY_INVALID', 'Drawing Geometry was rejected.', { cause });
  }
  if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)
    || Object.keys(geometry).sort().join(',') !== [...ENVELOPE_FIELDS].sort().join(',')
    || geometry.schemaVersion !== 1
    || typeof geometry.typeId !== 'string' || geometry.typeId.length === 0
    || typeof geometry.typeVersion !== 'string' || geometry.typeVersion.length === 0
    || !deepFrozen(geometry)) {
    failAnnotation(
      'ANNOTATION_GEOMETRY_CONTRACT_VIOLATION',
      'Geometry capability returned a malformed or mutable envelope.',
    );
  }
  return geometry;
}
