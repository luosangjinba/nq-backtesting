import { failCalculatedSeriesPersistence } from './persistence-error.js';

export const CALCULATED_SERIES_DOCUMENT_KEY_PREFIX = 'v7.calculated-series:document:';
export const CALCULATED_SERIES_DOCUMENT_ENVELOPE_SCHEMA = 'v7.calculated-series-document';
export const CALCULATED_SERIES_DOCUMENT_ENVELOPE_VERSION = 1;
export const CALCULATED_SERIES_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}

function portableClone(value) {
  let raw;
  try { raw = JSON.stringify(value); } catch (cause) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_VALUE_INVALID',
      'Calculated-series document is not JSON-compatible.',
      { cause },
    );
  }
  if (raw === undefined) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_VALUE_INVALID',
      'Calculated-series document is not JSON-compatible.',
    );
  }
  return { raw, value: canonical(JSON.parse(raw)) };
}

export function calculatedSeriesDocumentStorageKey(sessionId) {
  if (typeof sessionId !== 'string' || !ID.test(sessionId)) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_SESSION_INVALID',
      'Calculated-series storage requires an exact Session id.',
    );
  }
  return `${CALCULATED_SERIES_DOCUMENT_KEY_PREFIX}${sessionId}`;
}

/** Encode one canonical document wire in the fixed V1 sidecar envelope. */
export function encodeCalculatedSeriesDocumentEnvelope(sessionId, payload) {
  const key = calculatedSeriesDocumentStorageKey(sessionId);
  const cloned = portableClone(payload);
  if (cloned.value?.sessionId !== sessionId) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_SESSION_MISMATCH',
      'Calculated-series document belongs to another Session.',
    );
  }
  const envelope = {
    payload: cloned.value,
    schema: CALCULATED_SERIES_DOCUMENT_ENVELOPE_SCHEMA,
    version: CALCULATED_SERIES_DOCUMENT_ENVELOPE_VERSION,
  };
  const raw = JSON.stringify(envelope);
  if (new TextEncoder().encode(raw).byteLength > CALCULATED_SERIES_DOCUMENT_MAX_BYTES) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_RESOURCE_LIMIT',
      'Calculated-series document exceeds the 4 MiB sidecar ceiling.',
    );
  }
  return Object.freeze({ envelope: deepFreeze(envelope), key, raw });
}

/** Decode bytes without guessing schema, versions, Session identity, or semantics. */
export function decodeCalculatedSeriesDocumentEnvelope(sessionId, raw) {
  calculatedSeriesDocumentStorageKey(sessionId);
  if (typeof raw !== 'string' || raw.length === 0
    || new TextEncoder().encode(raw).byteLength > CALCULATED_SERIES_DOCUMENT_MAX_BYTES) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_BYTES_INVALID',
      'Calculated-series sidecar bytes are missing or oversized.',
    );
  }
  let value;
  try { value = JSON.parse(raw); } catch (cause) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_CORRUPT',
      'Calculated-series sidecar JSON is malformed.',
      { cause },
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'payload,schema,version'
    || value.schema !== CALCULATED_SERIES_DOCUMENT_ENVELOPE_SCHEMA
    || value.version !== CALCULATED_SERIES_DOCUMENT_ENVELOPE_VERSION) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_SCHEMA_UNSUPPORTED',
      'Calculated-series sidecar schema or version is unsupported.',
    );
  }
  if (value.payload?.sessionId !== sessionId) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_SESSION_MISMATCH',
      'Calculated-series sidecar belongs to another Session.',
    );
  }
  const canonicalRaw = encodeCalculatedSeriesDocumentEnvelope(sessionId, value.payload).raw;
  if (canonicalRaw !== raw) {
    failCalculatedSeriesPersistence(
      'CALCULATED_SERIES_PERSISTENCE_NON_CANONICAL',
      'Calculated-series sidecar bytes are not in canonical form.',
    );
  }
  return deepFreeze(value.payload);
}
