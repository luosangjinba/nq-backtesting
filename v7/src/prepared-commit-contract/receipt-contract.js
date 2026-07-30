import { failPreparedCommit } from './contract-error.js';

class PreparedCommitReceiptValue {
  #prepared;
  #value;

  constructor(prepared, value) {
    this.#prepared = prepared;
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  matches(prepared) { return this.#prepared === prepared; }

  read() { return this.#value; }
}

class PreparedRollbackReceiptValue {
  #prepared;
  #value;

  constructor(prepared, value) {
    this.#prepared = prepared;
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  matches(prepared) { return this.#prepared === prepared; }

  read() { return this.#value; }
}

class PreparedFinalizeReceiptValue {
  #prepared;
  #value;

  constructor(prepared, value) {
    this.#prepared = prepared;
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  matches(prepared) { return this.#prepared === prepared; }

  read() { return this.#value; }
}

function publicReceipt(scope, fields) {
  return {
    baseRevision: scope.baseRevision,
    candidate: scope.candidate,
    identity: scope.identity,
    participant: scope.participant,
    schemaVersion: 1,
    targetRevision: scope.targetRevision,
    ...fields,
  };
}

export function createPreparedCommitReceipt(prepared, scope, resultingRevision) {
  return new PreparedCommitReceiptValue(prepared, publicReceipt(scope, {
    resultingRevision,
    reversible: true,
    status: 'applied',
  }));
}

export function createPreparedRollbackReceipt(prepared, scope, resultingRevision, applied) {
  return new PreparedRollbackReceiptValue(prepared, publicReceipt(scope, {
    applied,
    resultingRevision,
    status: 'rolled-back',
  }));
}

export function createPreparedFinalizeReceipt(prepared, scope, resultingRevision) {
  return new PreparedFinalizeReceiptValue(prepared, publicReceipt(scope, {
    resultingRevision,
    reversible: false,
    status: 'finalized',
  }));
}

function requireReceipt(candidate, Type, code, label) {
  if (!(candidate instanceof Type)) {
    failPreparedCommit(code, `A branded ${label} receipt is required.`);
  }
  return candidate.read();
}

/** Read a reversible apply receipt without accepting a structural lookalike. */
export function readPreparedCommitReceipt(candidate) {
  return requireReceipt(
    candidate,
    PreparedCommitReceiptValue,
    'PREPARED_COMMIT_RECEIPT_REQUIRED',
    'Prepared Commit',
  );
}

/** Read a rollback receipt proving restoration to the exact base revision. */
export function readPreparedRollbackReceipt(candidate) {
  return requireReceipt(
    candidate,
    PreparedRollbackReceiptValue,
    'PREPARED_ROLLBACK_RECEIPT_REQUIRED',
    'Prepared Rollback',
  );
}

/** Read an irreversible finalize receipt for the exact applied candidate. */
export function readPreparedFinalizeReceipt(candidate) {
  return requireReceipt(
    candidate,
    PreparedFinalizeReceiptValue,
    'PREPARED_FINALIZE_RECEIPT_REQUIRED',
    'Prepared Finalize',
  );
}

export function requireMatchingPreparedCommitReceipt(candidate, prepared) {
  readPreparedCommitReceipt(candidate);
  if (!candidate.matches(prepared)) {
    failPreparedCommit(
      'PREPARED_COMMIT_RECEIPT_MISMATCH',
      'Prepared Commit receipt belongs to another participant preparation.',
    );
  }
  return candidate;
}

export function requireMatchingPreparedRollbackReceipt(candidate, prepared) {
  readPreparedRollbackReceipt(candidate);
  if (!candidate.matches(prepared)) {
    failPreparedCommit(
      'PREPARED_ROLLBACK_RECEIPT_MISMATCH',
      'Prepared Rollback receipt belongs to another participant preparation.',
    );
  }
  return candidate;
}

export function requireMatchingPreparedFinalizeReceipt(candidate, prepared) {
  readPreparedFinalizeReceipt(candidate);
  if (!candidate.matches(prepared)) {
    failPreparedCommit(
      'PREPARED_FINALIZE_RECEIPT_MISMATCH',
      'Prepared Finalize receipt belongs to another participant preparation.',
    );
  }
  return candidate;
}
