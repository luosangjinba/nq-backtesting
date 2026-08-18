/**
 * Owner: calculated-series-persistence.
 * Purpose: own Session-keyed canonical sidecar bytes, exact CAS, restore diagnostics, and reversible replacement.
 * Inputs: a bounded calculated-series document wire and an injected UTF-8 storage port.
 * Outputs: decoded payloads, stable diagnostics, branded preparations, and exact accepted raw bytes.
 * Side effects: reads/writes/removes only v7.calculated-series:document:<session-id> through the injected port.
 * Lifecycle: preparations settle once; the stateless adapter retains no process-global storage handle.
 * Errors: stable persistence failures reject corruption, wrong Session/schema, stale CAS, oversize, and failed rollback.
 * Concurrency/cancellation: synchronous exact-byte CAS; no queue, timer, network, or background task exists.
 */
export { CalculatedSeriesPersistenceError } from './persistence-error.js';
export {
  CALCULATED_SERIES_DOCUMENT_ENVELOPE_SCHEMA,
  CALCULATED_SERIES_DOCUMENT_ENVELOPE_VERSION,
  CALCULATED_SERIES_DOCUMENT_KEY_PREFIX,
  CALCULATED_SERIES_DOCUMENT_MAX_BYTES,
  calculatedSeriesDocumentStorageKey,
  decodeCalculatedSeriesDocumentEnvelope,
  encodeCalculatedSeriesDocumentEnvelope,
} from './document-envelope.js';
export { createCalculatedSeriesPersistenceAdapter } from './persistence-adapter.js';
