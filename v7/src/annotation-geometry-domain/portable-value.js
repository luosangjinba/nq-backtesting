import { failGeometry } from './geometry-error.js';

const MAX_DEPTH = 16;
const MAX_NODES = 4_096;
const MAX_STRING_LENGTH = 16_384;
const FORBIDDEN_PAYLOAD_KEY = /^(?:x|y|pixels?|pixelx|pixely|logical|logicalindex|canvas|canvaspath|domnode|domelement|charthandle|chartapi|serieshandle|seriesapi|seriesdata|nativehandle|bars|indicatorid|formulaid|calculatedseries|inputsnapshot|outputpoints)$/i;

function isPlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function portableValue(value, context, depth) {
  context.nodes += 1;
  if (context.nodes > MAX_NODES || depth > MAX_DEPTH) {
    failGeometry(
      'GEOMETRY_PAYLOAD_BOUNDS_EXCEEDED',
      'Geometry payload exceeds the portable depth or node budget.',
    );
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      failGeometry('GEOMETRY_PAYLOAD_BOUNDS_EXCEEDED', 'Geometry payload string is too large.');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      failGeometry('GEOMETRY_PAYLOAD_NON_PORTABLE', 'Geometry payload numbers must be finite.');
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') {
    failGeometry(
      'GEOMETRY_PAYLOAD_NON_PORTABLE',
      'Geometry payload supports only JSON-compatible immutable values.',
    );
  }
  if (context.seen.has(value)) {
    failGeometry('GEOMETRY_PAYLOAD_CYCLIC', 'Geometry payload cannot contain a cycle.');
  }
  context.seen.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(value.map((entry) => portableValue(entry, context, depth + 1)));
    }
    if (!isPlainRecord(value)) {
      failGeometry(
        'GEOMETRY_PAYLOAD_NON_PORTABLE',
        'Geometry payload records must use a plain object prototype.',
      );
    }
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      if (FORBIDDEN_PAYLOAD_KEY.test(key)) {
        failGeometry(
          'GEOMETRY_PAYLOAD_COORDINATE_SPACE_INVALID',
          `Geometry payload field ${key} is not market-coordinate state.`,
        );
      }
      normalized[key] = portableValue(value[key], context, depth + 1);
    }
    return Object.freeze(normalized);
  } finally {
    context.seen.delete(value);
  }
}

/** Normalize trusted definition output into deeply immutable portable market-coordinate state. */
export function normalizePortableGeometryPayload(value) {
  if (!isPlainRecord(value)) {
    failGeometry('GEOMETRY_PAYLOAD_INVALID', 'Geometry payload must be one plain record.');
  }
  return portableValue(value, { nodes: 0, seen: new WeakSet() }, 0);
}
