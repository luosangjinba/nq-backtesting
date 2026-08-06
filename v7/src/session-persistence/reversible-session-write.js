import { SessionPersistenceError } from './storage-adapter.js';

function fail(code, message, options) {
  throw new SessionPersistenceError(code, message, options);
}

function restoreExact(storage, key, expectedRaw, cause) {
  try {
    const observed = storage.read(key);
    if (observed !== expectedRaw) storage.write(key, expectedRaw);
    if (storage.read(key) !== expectedRaw) {
      fail(
        'SESSION_WRITE_ROLLBACK_FAILED',
        'Session write failed and its prior bytes could not be restored.',
        { cause },
      );
    }
  } catch (rollbackCause) {
    if (rollbackCause instanceof SessionPersistenceError
      && rollbackCause.code === 'SESSION_WRITE_ROLLBACK_FAILED') {
      throw rollbackCause;
    }
    fail(
      'SESSION_WRITE_ROLLBACK_FAILED',
      'Session write failed and its prior bytes could not be restored.',
      { cause: new AggregateError([cause, rollbackCause]) },
    );
  }
}

/**
 * Apply one exact raw Session envelope and retain the sole rollback authority.
 * A failed adapter write is repaired before control returns; an applied write
 * can then either finalize or restore the byte-identical previous envelope.
 */
export function applyReversibleSessionWrite({ key, nextRaw, previousRaw, revision, storage }) {
  try {
    storage.write(key, nextRaw);
    if (storage.read(key) !== nextRaw) {
      fail('SESSION_WRITE_NOT_DURABLE', 'Session write did not publish its exact value.');
    }
  } catch (error) {
    restoreExact(storage, key, previousRaw, error);
    throw error;
  }

  let status = 'applied';
  return Object.freeze({
    finalize() {
      if (status !== 'applied') {
        fail('SESSION_REVERSIBLE_WRITE_PHASE_INVALID', 'Only an applied Session write may finalize.');
      }
      status = 'finalized';
    },
    rollback() {
      if (status === 'rolled-back') return;
      if (status !== 'applied') {
        fail('SESSION_REVERSIBLE_WRITE_PHASE_INVALID', 'Only an applied Session write may roll back.');
      }
      if (storage.read(key) !== nextRaw) {
        fail(
          'SESSION_REVERSIBLE_WRITE_CONFLICT',
          'Session changed before its reversible write could roll back.',
        );
      }
      try {
        storage.write(key, previousRaw);
        if (storage.read(key) !== previousRaw) {
          fail(
            'SESSION_REVERSIBLE_WRITE_ROLLBACK_FAILED',
            'Session reversible write did not restore its exact prior bytes.',
          );
        }
      } catch (error) {
        if (storage.read(key) !== previousRaw) {
          fail(
            'SESSION_REVERSIBLE_WRITE_ROLLBACK_FAILED',
            'Session reversible write could not restore its exact prior bytes.',
            { cause: error },
          );
        }
      }
      status = 'rolled-back';
    },
    snapshot: () => Object.freeze({ revision, status }),
  });
}
