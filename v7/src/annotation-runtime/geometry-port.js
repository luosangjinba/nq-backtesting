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
  return Object.freeze({
    readDrawingGeometry: candidate.readDrawingGeometry,
    restoreDrawingGeometry: typeof candidate.restoreDrawingGeometry === 'function'
      ? candidate.restoreDrawingGeometry : null,
  });
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

/** Restore and validate one portable Geometry through the injected registered definition port. */
export function restoreAcceptedGeometry(contract, candidate) {
  if (contract === null || contract.restoreDrawingGeometry === null) {
    failAnnotation(
      'ANNOTATION_GEOMETRY_RESTORE_UNAVAILABLE',
      'Annotation Geometry restore capability is not installed.',
    );
  }
  let restored;
  try {
    restored = contract.restoreDrawingGeometry(candidate);
  } catch (cause) {
    failAnnotation('ANNOTATION_GEOMETRY_RESTORE_FAILED', 'Stored Drawing Geometry was rejected.', { cause });
  }
  return Object.freeze({
    branded: restored,
    snapshot: readAcceptedGeometry(contract, restored),
  });
}
