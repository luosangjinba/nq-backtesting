import {
  calculatedSeriesDocumentStorageKey,
  decodeCalculatedSeriesDocumentEnvelope,
  encodeCalculatedSeriesDocumentEnvelope,
} from './document-envelope.js';
import { failCalculatedSeriesPersistence } from './persistence-error.js';
import {
  createCalculatedSeriesPersistencePreparation,
  readCalculatedSeriesPersistencePreparation,
} from './reversible-write.js';

function requireStorage(value) {
  for (const method of ['read', 'remove', 'write']) {
    if (typeof value?.[method] !== 'function') {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_STORAGE_INVALID',
        `Calculated-series storage requires ${method}().`,
      );
    }
  }
  return value;
}

/** Own exact Session-keyed V1 sidecar bytes and reversible CAS replacement. */
export function createCalculatedSeriesPersistenceAdapter({ storage } = {}) {
  const port = requireStorage(storage);

  function restore(sessionId) {
    const key = calculatedSeriesDocumentStorageKey(sessionId);
    let raw;
    try { raw = port.read(key); } catch (cause) {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_READ_FAILED',
        'Calculated-series sidecar could not be read.',
        { cause },
      );
    }
    if (raw === null) return Object.freeze({ payload: null, raw: null, status: 'empty' });
    try {
      return Object.freeze({
        payload: decodeCalculatedSeriesDocumentEnvelope(sessionId, raw), raw, status: 'ready',
      });
    } catch (error) {
      return Object.freeze({
        diagnostic: Object.freeze({ code: error.code, message: error.message }),
        payload: null,
        raw,
        status: 'corrupt',
      });
    }
  }

  function prepare({ expectedRaw, payload, sessionId } = {}) {
    if (expectedRaw !== null && typeof expectedRaw !== 'string') {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_CAS_INVALID',
        'Expected sidecar bytes must be null or an exact string.',
      );
    }
    const encoded = encodeCalculatedSeriesDocumentEnvelope(sessionId, payload);
    let currentRaw;
    try { currentRaw = port.read(encoded.key); } catch (cause) {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_READ_FAILED',
        'Calculated-series sidecar could not be read for CAS.',
        { cause },
      );
    }
    if (currentRaw !== expectedRaw) {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_CAS_STALE',
        'Calculated-series sidecar changed; reload the current document and retry.',
      );
    }
    return createCalculatedSeriesPersistencePreparation({
      candidateRaw: encoded.raw,
      key: encoded.key,
      previousRaw: currentRaw,
      state: 'prepared',
    });
  }

  function apply(preparation) {
    const record = readCalculatedSeriesPersistencePreparation(preparation);
    if (record.state !== 'prepared') {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_PHASE_INVALID',
        'Only a prepared sidecar write may apply.',
      );
    }
    const currentRaw = port.read(record.key);
    if (currentRaw !== record.previousRaw) {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_CAS_STALE',
        'Calculated-series sidecar changed before apply.',
      );
    }
    try {
      port.write(record.key, record.candidateRaw);
      if (port.read(record.key) !== record.candidateRaw) {
        throw new Error('Sidecar readback differs from the candidate bytes.');
      }
    } catch (cause) {
      let rollbackCause = null;
      try {
        if (record.previousRaw === null) port.remove(record.key);
        else port.write(record.key, record.previousRaw);
        if (port.read(record.key) !== record.previousRaw) {
          throw new Error('Prior sidecar bytes were not restored.');
        }
      } catch (error) { rollbackCause = error; }
      failCalculatedSeriesPersistence(
        rollbackCause === null
          ? 'CALCULATED_SERIES_PERSISTENCE_WRITE_FAILED'
          : 'CALCULATED_SERIES_PERSISTENCE_ROLLBACK_FAILED',
        rollbackCause === null
          ? 'Calculated-series sidecar replacement failed.'
          : 'Calculated-series sidecar write failed and prior bytes could not be restored.',
        { cause: rollbackCause === null ? cause : new AggregateError([cause, rollbackCause]) },
      );
    }
    record.state = 'applied';
    return Object.freeze({ raw: record.candidateRaw });
  }

  function rollback(preparation) {
    const record = readCalculatedSeriesPersistencePreparation(preparation);
    if (record.state === 'rolled-back') return;
    if (record.state === 'finalized') {
      failCalculatedSeriesPersistence(
        'CALCULATED_SERIES_PERSISTENCE_PHASE_INVALID',
        'A finalized sidecar write cannot roll back.',
      );
    }
    if (record.state === 'applied') {
      try {
        if (port.read(record.key) !== record.candidateRaw) {
          throw new Error('Calculated-series sidecar changed before rollback.');
        }
        if (record.previousRaw === null) port.remove(record.key);
        else port.write(record.key, record.previousRaw);
        if (port.read(record.key) !== record.previousRaw) {
          throw new Error('Calculated-series sidecar rollback readback differs.');
        }
      } catch (cause) {
        failCalculatedSeriesPersistence(
          'CALCULATED_SERIES_PERSISTENCE_ROLLBACK_FAILED',
          'Calculated-series sidecar rollback could not restore prior bytes.',
          { cause },
        );
      }
    }
    record.state = 'rolled-back';
  }

  return Object.freeze({
    apply,
    finalize(preparation) {
      const record = readCalculatedSeriesPersistencePreparation(preparation);
      if (record.state !== 'applied') {
        failCalculatedSeriesPersistence(
          'CALCULATED_SERIES_PERSISTENCE_PHASE_INVALID',
          'Only an applied sidecar write may finalize.',
        );
      }
      record.state = 'finalized';
      return Object.freeze({ raw: record.candidateRaw });
    },
    prepare,
    restore,
    rollback,
  });
}
