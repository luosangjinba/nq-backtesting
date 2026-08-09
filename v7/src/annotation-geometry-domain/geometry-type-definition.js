import { createDrawingGeometryValue } from './drawing-geometry.js';
import { AnnotationGeometryError, failGeometry } from './geometry-error.js';
import { createMarketAnchor, readMarketAnchor } from './market-anchor.js';

const TYPE_ID_PATTERN = /^geometry\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const GEOMETRY_TYPE_IDS = Object.freeze({
  point: 'geometry.point',
  rectangle: 'geometry.rectangle',
  segment: 'geometry.segment',
});

class GeometryTypeDefinitionValue {
  #metadata;
  #normalize;
  #restore;

  constructor({ normalize, restore = normalize, typeId, version }) {
    this.#metadata = Object.freeze({ typeId, version });
    this.#normalize = normalize;
    this.#restore = restore;
    Object.freeze(this);
  }

  create(input) {
    let payload;
    try {
      payload = this.#normalize(input);
    } catch (cause) {
      if (cause instanceof AnnotationGeometryError) throw cause;
      failGeometry(
        'GEOMETRY_DEFINITION_NORMALIZATION_FAILED',
        `Geometry definition ${this.#metadata.typeId} could not normalize input.`,
        { cause },
      );
    }
    return createDrawingGeometryValue({
      payload,
      typeId: this.#metadata.typeId,
      typeVersion: this.#metadata.version,
    });
  }

  read() { return this.#metadata; }

  restore(payload) {
    let normalized;
    try {
      normalized = this.#restore(payload);
    } catch (cause) {
      if (cause instanceof AnnotationGeometryError) throw cause;
      failGeometry(
        'GEOMETRY_DEFINITION_RESTORE_FAILED',
        `Geometry definition ${this.#metadata.typeId} could not restore payload.`,
        { cause },
      );
    }
    return createDrawingGeometryValue({
      payload: normalized,
      typeId: this.#metadata.typeId,
      typeVersion: this.#metadata.version,
    });
  }
}

function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failGeometry('GEOMETRY_INPUT_INVALID', `${label} must be one exact record.`);
  }
  if (Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failGeometry('GEOMETRY_INPUT_FIELDS_INVALID', `${label} fields must be exact.`);
  }
}

function sameInstrument(first, second, code, label) {
  if (first.instrumentId !== second.instrumentId) {
    failGeometry(code, `${label} anchors must use one exact instrument.`);
  }
}

function segmentPayload(startCandidate, endCandidate) {
  const startAnchor = readMarketAnchor(startCandidate);
  const endAnchor = readMarketAnchor(endCandidate);
  sameInstrument(startAnchor, endAnchor, 'SEGMENT_INSTRUMENT_MISMATCH', 'Segment');
  if (startAnchor.epochMs === endAnchor.epochMs && startAnchor.price === endAnchor.price) {
    failGeometry('SEGMENT_DEGENERATE', 'Segment anchors must not be identical.');
  }
  return { endAnchor, startAnchor };
}

function rectanglePayload(firstCandidate, secondCandidate) {
  const first = readMarketAnchor(firstCandidate);
  const second = readMarketAnchor(secondCandidate);
  sameInstrument(first, second, 'RECTANGLE_INSTRUMENT_MISMATCH', 'Rectangle');
  const startEpochMs = Math.min(first.epochMs, second.epochMs);
  const endEpochMs = Math.max(first.epochMs, second.epochMs);
  const lowPrice = Math.min(first.price, second.price);
  const highPrice = Math.max(first.price, second.price);
  if (startEpochMs === endEpochMs) {
    failGeometry('RECTANGLE_TIME_RANGE_DEGENERATE', 'Rectangle requires a non-zero time range.');
  }
  if (lowPrice === highPrice) {
    failGeometry('RECTANGLE_PRICE_RANGE_DEGENERATE', 'Rectangle requires a non-zero price range.');
  }
  return {
    endEpochMs,
    highPrice,
    instrumentId: first.instrumentId,
    lowPrice,
    startEpochMs,
  };
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: define one trusted-build, market-coordinate Geometry normalization policy.
 * Inputs/outputs: exact type id, semantic version, and synchronous normalizer; branded definition.
 * Side effects/lifecycle: none; definition registration is immutable and composition-local.
 * Errors: AnnotationGeometryError for malformed ids, versions, fields, or normalizers.
 * Concurrency/cancellation: normalization is synchronous and deterministic.
 */
export function defineGeometryType(value = {}) {
  const fields = Object.hasOwn(value, 'restore')
    ? ['normalize', 'restore', 'typeId', 'version'] : ['normalize', 'typeId', 'version'];
  exactRecord(value, fields, 'Geometry Type Definition');
  if (typeof value.typeId !== 'string' || !TYPE_ID_PATTERN.test(value.typeId)) {
    failGeometry('GEOMETRY_TYPE_ID_INVALID', 'Geometry type id must use geometry.<namespace>.');
  }
  if (typeof value.version !== 'string' || !VERSION_PATTERN.test(value.version)) {
    failGeometry('GEOMETRY_TYPE_VERSION_INVALID', 'Geometry type version must use semantic x.y.z.');
  }
  if (typeof value.normalize !== 'function') {
    failGeometry('GEOMETRY_TYPE_NORMALIZER_INVALID', 'Geometry type requires one synchronous normalizer.');
  }
  if (Object.hasOwn(value, 'restore') && typeof value.restore !== 'function') {
    failGeometry('GEOMETRY_TYPE_RESTORER_INVALID', 'Geometry type restore policy must be synchronous.');
  }
  return new GeometryTypeDefinitionValue(value);
}

/**
 * Owner: Annotation Geometry Domain.
 * Purpose: expose safe definition identity/version metadata without the normalizer.
 * Inputs/outputs: branded Geometry definition; frozen metadata record.
 * Side effects/lifecycle: none.
 * Errors: AnnotationGeometryError for structural lookalikes.
 * Concurrency/cancellation: synchronous and deterministic.
 */
export function readGeometryTypeDefinition(candidate) {
  if (!(candidate instanceof GeometryTypeDefinitionValue)) {
    failGeometry('GEOMETRY_TYPE_DEFINITION_REQUIRED', 'A branded Geometry Type Definition is required.');
  }
  return candidate.read();
}

/** Require a branded definition at the internal registry boundary. */
export function requireGeometryTypeDefinition(candidate) {
  readGeometryTypeDefinition(candidate);
  return candidate;
}

/** Create Geometry through one already validated definition without exposing its normalizer. */
export function createGeometryFromDefinition(definition, input) {
  return requireGeometryTypeDefinition(definition).create(input);
}

/** Restore portable Geometry payload through one trusted registered definition. */
export function restoreGeometryFromDefinition(definition, payload) {
  return requireGeometryTypeDefinition(definition).restore(payload);
}

/** Validate a public Geometry type id before lookup or creation. */
export function requireGeometryTypeId(typeId) {
  if (typeof typeId !== 'string' || !TYPE_ID_PATTERN.test(typeId)) {
    failGeometry('GEOMETRY_TYPE_ID_INVALID', 'Geometry type id must use geometry.<namespace>.');
  }
  return typeId;
}

const POINT_DEFINITION = defineGeometryType({
  typeId: GEOMETRY_TYPE_IDS.point,
  version: '1.0.0',
  normalize(value) {
    exactRecord(value, ['anchor'], 'Point Geometry input');
    return { anchor: readMarketAnchor(value.anchor) };
  },
  restore(value) {
    exactRecord(value, ['anchor'], 'Stored Point Geometry payload');
    return { anchor: readMarketAnchor(createMarketAnchor(value.anchor)) };
  },
});

const SEGMENT_DEFINITION = defineGeometryType({
  typeId: GEOMETRY_TYPE_IDS.segment,
  version: '1.0.0',
  normalize(value) {
    exactRecord(value, ['endAnchor', 'startAnchor'], 'Segment Geometry input');
    return segmentPayload(value.startAnchor, value.endAnchor);
  },
  restore(value) {
    exactRecord(value, ['endAnchor', 'startAnchor'], 'Stored Segment Geometry payload');
    return segmentPayload(
      createMarketAnchor(value.startAnchor),
      createMarketAnchor(value.endAnchor),
    );
  },
});

const RECTANGLE_DEFINITION = defineGeometryType({
  typeId: GEOMETRY_TYPE_IDS.rectangle,
  version: '1.0.0',
  normalize(value) {
    exactRecord(value, ['firstAnchor', 'secondAnchor'], 'Rectangle Geometry input');
    return rectanglePayload(value.firstAnchor, value.secondAnchor);
  },
  restore(value) {
    exactRecord(
      value,
      ['endEpochMs', 'highPrice', 'instrumentId', 'lowPrice', 'startEpochMs'],
      'Stored Rectangle Geometry payload',
    );
    return rectanglePayload(
      createMarketAnchor({
        epochMs: value.startEpochMs,
        instrumentId: value.instrumentId,
        price: value.lowPrice,
      }),
      createMarketAnchor({
        epochMs: value.endEpochMs,
        instrumentId: value.instrumentId,
        price: value.highPrice,
      }),
    );
  },
});

/** Return the immutable initial trusted definitions for registry composition. */
export function initialGeometryTypeDefinitions() {
  return Object.freeze([POINT_DEFINITION, SEGMENT_DEFINITION, RECTANGLE_DEFINITION]);
}

/** Create one branded Point Geometry through the initial Point definition. */
export function createPointGeometry(value) {
  return createGeometryFromDefinition(POINT_DEFINITION, value);
}

/** Create one branded Segment Geometry through the initial Segment definition. */
export function createSegmentGeometry(value) {
  return createGeometryFromDefinition(SEGMENT_DEFINITION, value);
}

/** Create one normalized branded Rectangle Geometry through its initial definition. */
export function createRectangleGeometry(value) {
  return createGeometryFromDefinition(RECTANGLE_DEFINITION, value);
}
