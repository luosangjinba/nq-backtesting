import { failGeometry } from './geometry-error.js';
import {
  createGeometryFromDefinition,
  initialGeometryTypeDefinitions,
  readGeometryTypeDefinition,
  projectGeometryAnchorsFromDefinition,
  requireGeometryTypeDefinition,
  requireGeometryTypeId,
  restoreGeometryFromDefinition,
} from './geometry-type-definition.js';

const ENVELOPE_FIELDS = Object.freeze(['payload', 'schemaVersion', 'typeId', 'typeVersion']);

function exactRegistryInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).join(',') !== 'definitions') {
    failGeometry('GEOMETRY_REGISTRY_INPUT_INVALID', 'Geometry Registry input must contain only definitions.');
  }
  if (!Array.isArray(value.definitions)) {
    failGeometry('GEOMETRY_REGISTRY_DEFINITIONS_INVALID', 'Geometry Registry definitions must be an array.');
  }
}

function requireStoredEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...ENVELOPE_FIELDS].sort().join(',')
    || value.schemaVersion !== 1 || typeof value.typeVersion !== 'string') {
    failGeometry('GEOMETRY_STORED_ENVELOPE_INVALID', 'Stored Geometry envelope is invalid.');
  }
  return value;
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: compose isolated trusted Geometry definitions without concrete-type branching.
 * Inputs/outputs: branded definition list; frozen registry with deterministic lookup/list/create methods.
 * Side effects/lifecycle: none; the registry owns no global mutation, cache, listener, or disposal.
 * Errors: AnnotationGeometryError for malformed, duplicate, unknown, or invalid definition work.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
export function createGeometryRegistry(value = {}) {
  exactRegistryInput(value);
  const byTypeId = new Map();
  for (const candidate of value.definitions) {
    const definition = requireGeometryTypeDefinition(candidate);
    const metadata = readGeometryTypeDefinition(definition);
    if (byTypeId.has(metadata.typeId)) {
      failGeometry(
        'GEOMETRY_REGISTRY_DUPLICATE_TYPE',
        `Geometry type ${metadata.typeId} is registered more than once.`,
      );
    }
    byTypeId.set(metadata.typeId, definition);
  }
  const metadata = Object.freeze([...byTypeId.values()]
    .map(readGeometryTypeDefinition)
    .sort((left, right) => left.typeId.localeCompare(right.typeId)));
  return Object.freeze({
    create(typeId, input) {
      const id = requireGeometryTypeId(typeId);
      const definition = byTypeId.get(id);
      if (!definition) {
        failGeometry('GEOMETRY_REGISTRY_TYPE_UNKNOWN', `Geometry type ${id} is not registered.`);
      }
      return createGeometryFromDefinition(definition, input);
    },
    get(typeId) {
      const definition = byTypeId.get(requireGeometryTypeId(typeId));
      return definition ? readGeometryTypeDefinition(definition) : null;
    },
    list: () => metadata,
    projectAnchors(candidate, projectAnchor) {
      const envelope = requireStoredEnvelope(candidate);
      const id = requireGeometryTypeId(envelope.typeId);
      const definition = byTypeId.get(id);
      if (!definition) {
        failGeometry('GEOMETRY_REGISTRY_TYPE_UNKNOWN', `Geometry type ${id} is not registered.`);
      }
      const definitionMetadata = readGeometryTypeDefinition(definition);
      if (definitionMetadata.version !== envelope.typeVersion) {
        failGeometry(
          'GEOMETRY_STORED_VERSION_UNSUPPORTED',
          `Geometry type ${id} does not support stored version ${envelope.typeVersion}.`,
        );
      }
      return projectGeometryAnchorsFromDefinition(definition, envelope.payload, projectAnchor);
    },
    restore(candidate) {
      const envelope = requireStoredEnvelope(candidate);
      const id = requireGeometryTypeId(envelope.typeId);
      const definition = byTypeId.get(id);
      if (!definition) {
        failGeometry('GEOMETRY_REGISTRY_TYPE_UNKNOWN', `Geometry type ${id} is not registered.`);
      }
      const definitionMetadata = readGeometryTypeDefinition(definition);
      if (definitionMetadata.version !== envelope.typeVersion) {
        failGeometry(
          'GEOMETRY_STORED_VERSION_UNSUPPORTED',
          `Geometry type ${id} does not support stored version ${envelope.typeVersion}.`,
        );
      }
      return restoreGeometryFromDefinition(definition, envelope.payload);
    },
  });
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: compose only the accepted Point, Segment, and Rectangle definitions.
 * Inputs/outputs: no input; isolated immutable initial Geometry Registry.
 * Side effects/lifecycle: none; each call creates an independent registry surface.
 * Errors: AnnotationGeometryError only if the binding initial definitions become invalid.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function createInitialGeometryRegistry() {
  return createGeometryRegistry({ definitions: initialGeometryTypeDefinitions() });
}

/** Restore one initial Point/Segment/Rectangle Geometry from its portable envelope. */
export function restoreDrawingGeometry(candidate) {
  return createInitialGeometryRegistry().restore(candidate);
}

/** Project built-in Geometry anchors without exposing concrete type branches. */
export function projectDrawingGeometryAnchors(candidate, projectAnchor) {
  const projected = createInitialGeometryRegistry().projectAnchors(candidate, projectAnchor);
  return projected === null ? null : projected;
}
