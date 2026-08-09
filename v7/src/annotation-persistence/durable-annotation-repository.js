import { serializeSessionId } from '../session-identity/public.js';
import { failAnnotationPersistence } from './annotation-persistence-error.js';
import {
  decodeAnnotationEntry,
  decodeAnnotationExport,
  encodeAnnotationEntry,
  encodeAnnotationExport,
  projectAnnotationOpaqueState,
} from './annotation-wire.js';
import { createReversibleAnnotationWrite } from './reversible-annotation-write.js';

const PREPARE_FIELDS = Object.freeze([
  'baseDocument',
  'baseHistory',
  'candidateDocument',
  'candidateHistory',
  'candidateOpaqueState',
  'expectedRevision',
  'sessionId',
]);

function requireStorage(storage) {
  if (!storage || typeof storage !== 'object'
    || ['read', 'remove', 'write'].some((method) => typeof storage[method] !== 'function')) {
    failAnnotationPersistence(
      'ANNOTATION_STORAGE_ADAPTER_INVALID',
      'Durable Annotation Repository requires an explicit storage adapter.',
    );
  }
  return storage;
}

function requireNamespace(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) {
    failAnnotationPersistence(
      'ANNOTATION_REPOSITORY_NAMESPACE_INVALID',
      'Annotation Repository namespace is invalid.',
    );
  }
  return value;
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failAnnotationPersistence(code, `${label} fields are invalid.`);
  }
}

function requireRevision(value, minimum = 0) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_REVISION_INVALID', 'Annotation revision is invalid.');
  }
  return value;
}

function documentSession(document, sessionId) {
  if (document?.sessionId !== serializeSessionId(sessionId).value) {
    failAnnotationPersistence('ANNOTATION_PERSISTENCE_SESSION_MISMATCH', 'Annotation document Session mismatch.');
  }
}

/**
 * Create one explicit-Session durable repository with no current-Session key.
 * The repository owns bytes/migration/opaque fields; Runtime owns accepted state.
 */
export function createDurableAnnotationRepository({
  namespace = 'v7.annotation-history',
  storage,
} = {}) {
  const port = requireStorage(storage);
  const prefix = requireNamespace(namespace);
  const keyFor = (sessionId) => (
    `${prefix}:session:${encodeURIComponent(serializeSessionId(sessionId).value)}`
  );

  function readEntry(sessionId) {
    const raw = port.read(keyFor(sessionId));
    return raw === null ? null : decodeAnnotationEntry(raw, sessionId);
  }

  return Object.freeze({
    exportDocument({ document, opaqueState, sessionId } = {}) {
      documentSession(document, sessionId);
      return encodeAnnotationExport({ document, opaqueState });
    },
    load({ sessionId } = {}) {
      const restored = readEntry(sessionId);
      return restored;
    },
    parseImport({ payload, sessionId } = {}) {
      return decodeAnnotationExport(payload, sessionId);
    },
    prepare(input) {
      exactRecord(
        input,
        PREPARE_FIELDS,
        'ANNOTATION_PERSISTENCE_PREPARE_INVALID',
        'Annotation Repository preparation',
      );
      const expectedRevision = requireRevision(input.expectedRevision);
      documentSession(input.baseDocument, input.sessionId);
      documentSession(input.candidateDocument, input.sessionId);
      if (input.baseDocument.revision !== expectedRevision
        || input.candidateDocument.revision !== expectedRevision + 1) {
        failAnnotationPersistence(
          'ANNOTATION_PERSISTENCE_REVISION_CONFLICT',
          'Annotation candidate revision is not the exact successor.',
        );
      }
      const annotationKey = keyFor(input.sessionId);
      const previousRaw = port.read(annotationKey);
      if (previousRaw === null ? expectedRevision !== 0
        : decodeAnnotationEntry(previousRaw, input.sessionId).document.revision !== expectedRevision) {
        failAnnotationPersistence(
          'ANNOTATION_PERSISTENCE_REVISION_CONFLICT',
          'Persisted Annotation revision changed before prepare.',
        );
      }
      const candidateOpaqueState = projectAnnotationOpaqueState(
        input.candidateOpaqueState,
        input.candidateDocument,
      );
      const candidateRaw = encodeAnnotationEntry({
        document: input.candidateDocument,
        history: input.candidateHistory,
        opaqueState: candidateOpaqueState,
        sessionId: input.sessionId,
      });
      const write = createReversibleAnnotationWrite({
        annotationKey,
        candidateRaw,
        previousRaw,
        storage: port,
      });
      let settled = false;
      return Object.freeze({
        apply: () => write.apply(),
        finalize() {
          if (settled) {
            failAnnotationPersistence('ANNOTATION_PERSISTENCE_PHASE_INVALID', 'Preparation already settled.');
          }
          write.finalize();
          settled = true;
          return Object.freeze({ opaqueState: candidateOpaqueState });
        },
        rollback() {
          if (settled) {
            failAnnotationPersistence('ANNOTATION_PERSISTENCE_PHASE_INVALID', 'Finalized preparation cannot roll back.');
          }
          write.rollback();
          settled = true;
        },
        snapshot: write.snapshot,
      });
    },
  });
}
