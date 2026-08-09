import { failAnnotationPersistence } from './annotation-persistence-error.js';

function restorePrevious(storage, annotationKey, candidateRaw, previousRaw, cause) {
  const observed = storage.read(annotationKey);
  if (observed !== candidateRaw && observed !== previousRaw) {
    failAnnotationPersistence(
      'ANNOTATION_WRITE_ROLLBACK_CONFLICT',
      'Annotation bytes changed before rollback.',
      { cause },
    );
  }
  try {
    if (previousRaw === null) storage.remove(annotationKey);
    else storage.write(annotationKey, previousRaw);
  } catch (rollbackCause) {
    failAnnotationPersistence(
      'ANNOTATION_WRITE_ROLLBACK_FAILED',
      'Annotation bytes could not restore their exact prior value.',
      { cause: new AggregateError([cause, rollbackCause]) },
    );
  }
  if (storage.read(annotationKey) !== previousRaw) {
    failAnnotationPersistence(
      'ANNOTATION_WRITE_ROLLBACK_FAILED',
      'Annotation byte rollback was not durable.',
      { cause },
    );
  }
}

/** Create one prepared exact-byte write with a single reversible lifecycle. */
export function createReversibleAnnotationWrite({
  annotationKey,
  candidateRaw,
  previousRaw,
  storage,
}) {
  let phase = 'prepared';
  let applyFailure = null;
  return Object.freeze({
    apply() {
      if (phase !== 'prepared') {
        failAnnotationPersistence('ANNOTATION_WRITE_PHASE_INVALID', 'Only a prepared write may apply.');
      }
      try {
        if (storage.read(annotationKey) !== previousRaw) {
          failAnnotationPersistence(
            'ANNOTATION_WRITE_CONFLICT',
            'Annotation bytes changed after prepare.',
          );
        }
        storage.write(annotationKey, candidateRaw);
        if (storage.read(annotationKey) !== candidateRaw) {
          failAnnotationPersistence(
            'ANNOTATION_WRITE_NOT_DURABLE',
            'Annotation write did not publish its exact bytes.',
          );
        }
        phase = 'applied';
      } catch (cause) {
        applyFailure = cause;
        phase = 'apply-failed';
        throw cause;
      }
    },
    finalize() {
      if (phase !== 'applied') {
        failAnnotationPersistence('ANNOTATION_WRITE_PHASE_INVALID', 'Only an applied write may finalize.');
      }
      phase = 'finalized';
    },
    rollback(cause = applyFailure) {
      if (phase === 'rolled-back') return;
      if (!['applied', 'apply-failed'].includes(phase)) {
        failAnnotationPersistence('ANNOTATION_WRITE_PHASE_INVALID', 'Write cannot roll back in this phase.');
      }
      restorePrevious(storage, annotationKey, candidateRaw, previousRaw, cause);
      phase = 'rolled-back';
    },
    snapshot: () => Object.freeze({ phase }),
  });
}
