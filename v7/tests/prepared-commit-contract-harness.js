import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import {
  PREPARED_COMMIT_PARTICIPANTS,
  PreparedCommitContractError,
  createPreparedCommit,
  readPreparedCommitReceipt,
  readPreparedFinalizeReceipt,
  readPreparedRollbackReceipt,
  requireMatchingPreparedCommitReceipt,
  requireMatchingPreparedFinalizeReceipt,
  requireMatchingPreparedRollbackReceipt,
  requirePreparedCommit,
} from '../src/prepared-commit-contract/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/prepared-commit-contract/negative/cases.json',
), 'utf8'));
const sessionId = createSessionId('prepared-commit-session');
const activationGeneration = createActivationGeneration(1);

function identity(suffix) {
  return createWorkspaceTransactionIdentity({
    activationGeneration,
    sessionId,
    transactionId: createTransactionId(`prepared-${suffix}`),
  });
}

function immutableCandidate(label) {
  return Object.freeze({ label, payload: Object.freeze({ revision: 1 }) });
}

function prepared(suffix, overrides = {}) {
  return createPreparedCommit({
    baseRevision: 4,
    candidate: immutableCandidate(suffix),
    identity: identity(suffix),
    participant: 'chart',
    preparedRevision: 4,
    schemaVersion: 1,
    ...overrides,
  });
}

function fakeOwner(participant, transactionIdentity) {
  const state = { revision: 9, trace: [], value: 'accepted' };
  const candidate = immutableCandidate(`${participant}-candidate`);
  const lifecycle = createPreparedCommit({
    baseRevision: state.revision,
    candidate,
    identity: transactionIdentity,
    participant,
    preparedRevision: state.revision,
    schemaVersion: 1,
  });
  state.trace.push('prepare');
  return Object.freeze({
    apply() {
      state.value = candidate.label;
      state.revision += 1;
      state.trace.push('apply');
      return lifecycle.apply({ identity: transactionIdentity, resultingRevision: state.revision });
    },
    finalize(commitReceipt) {
      const receipt = lifecycle.finalize({
        commitReceipt,
        identity: transactionIdentity,
        resultingRevision: state.revision,
      });
      state.trace.push('finalize');
      return receipt;
    },
    lifecycle,
    read: () => Object.freeze({
      revision: state.revision,
      trace: Object.freeze([...state.trace]),
      value: state.value,
    }),
    rollback(commitReceipt = null) {
      const wasApplied = commitReceipt !== null;
      if (wasApplied) {
        state.value = 'accepted';
        state.revision -= 1;
      }
      const receipt = lifecycle.rollback({
        commitReceipt,
        identity: transactionIdentity,
        resultingRevision: state.revision,
      });
      state.trace.push('rollback');
      return receipt;
    },
  });
}

assert.deepEqual(PREPARED_COMMIT_PARTICIPANTS, [
  'chart', 'replay', 'workspace-state', 'publication',
]);
const successfulIdentity = identity('all-participants');
const owners = PREPARED_COMMIT_PARTICIPANTS.map(
  (participant) => fakeOwner(participant, successfulIdentity),
);
for (const owner of owners) {
  assert.deepEqual(owner.read(), {
    revision: 9,
    trace: ['prepare'],
    value: 'accepted',
  }, 'prepare must leave visible and semantic owner state unchanged');
  assert.equal(requirePreparedCommit(owner.lifecycle), owner.lifecycle);
  assert.equal(owner.lifecycle.snapshot().mutationPolicy, 'none');
  assert.equal(owner.lifecycle.snapshot().preparedRevision, 9);
  assert.equal(owner.lifecycle.snapshot().targetRevision, 10);
}

const commitReceipts = owners.map((owner) => owner.apply());
for (let index = 0; index < owners.length; index += 1) {
  const owner = owners[index];
  const receipt = commitReceipts[index];
  assert.equal(requireMatchingPreparedCommitReceipt(receipt, owner.lifecycle), receipt);
  assert.deepEqual(readPreparedCommitReceipt(receipt), {
    baseRevision: 9,
    candidate: owner.lifecycle.snapshot().candidate,
    identity: successfulIdentity,
    participant: PREPARED_COMMIT_PARTICIPANTS[index],
    resultingRevision: 10,
    reversible: true,
    schemaVersion: 1,
    status: 'applied',
    targetRevision: 10,
  });
  assert.equal(owner.lifecycle.snapshot().mutationPolicy, 'reversible-only');
}

const finalizeReceipts = owners.map((owner, index) => owner.finalize(commitReceipts[index]));
for (let index = 0; index < owners.length; index += 1) {
  const owner = owners[index];
  const receipt = finalizeReceipts[index];
  assert.equal(requireMatchingPreparedFinalizeReceipt(receipt, owner.lifecycle), receipt);
  assert.equal(readPreparedFinalizeReceipt(receipt).resultingRevision, 10);
  assert.equal(readPreparedFinalizeReceipt(receipt).reversible, false);
  assert.equal(owner.lifecycle.snapshot().mutationPolicy, 'irreversible-accepted');
}

const partialIdentity = identity('partial-failure');
const partialOwners = PREPARED_COMMIT_PARTICIPANTS.map(
  (participant) => fakeOwner(participant, partialIdentity),
);
const partialReceipts = [partialOwners[0].apply(), partialOwners[1].apply(), null, null];
const rollbackReceipts = [];
for (let index = partialOwners.length - 1; index >= 0; index -= 1) {
  rollbackReceipts[index] = partialOwners[index].rollback(partialReceipts[index]);
}
assert.deepEqual(
  partialOwners.map((owner) => ({ revision: owner.read().revision, value: owner.read().value })),
  PREPARED_COMMIT_PARTICIPANTS.map(() => ({ revision: 9, value: 'accepted' })),
  'partial failure must restore every prepared/applied participant to its base revision',
);
assert.deepEqual(rollbackReceipts.map((receipt) => readPreparedRollbackReceipt(receipt).applied), [
  true, true, false, false,
]);
for (let index = 0; index < partialOwners.length; index += 1) {
  assert.equal(
    requireMatchingPreparedRollbackReceipt(rollbackReceipts[index], partialOwners[index].lifecycle),
    rollbackReceipts[index],
  );
}

const negativeActions = {
  'unsupported-version': () => prepared('bad-version', { schemaVersion: 2 }),
  'unknown-input-field': () => prepared('extra-field', { unexpected: true }),
  'raw-identity': () => prepared('raw-identity', { identity: {} }),
  'invalid-participant': () => prepared('invalid-participant', { participant: 'persistence' }),
  'mutable-candidate': () => prepared('mutable-candidate', { candidate: {} }),
  'mutable-nested-candidate': () => prepared('mutable-nested', {
    candidate: Object.freeze({ payload: {} }),
  }),
  'invalid-base-revision': () => prepared('bad-revision', { baseRevision: -1, preparedRevision: -1 }),
  'prepare-mutated-revision': () => prepared('prepare-mutated', { preparedRevision: 5 }),
  'exhausted-revision': () => prepared('exhausted', {
    baseRevision: Number.MAX_SAFE_INTEGER,
    preparedRevision: Number.MAX_SAFE_INTEGER,
  }),
  'forged-prepared': () => requirePreparedCommit({ snapshot() {} }),
  'foreign-identity-apply': () => {
    const value = prepared('foreign-apply');
    value.apply({ identity: identity('other-apply'), resultingRevision: 5 });
  },
  'skipped-apply-revision': () => {
    const value = prepared('skip-apply');
    value.apply({ identity: value.snapshot().identity, resultingRevision: 6 });
  },
  'duplicate-apply': () => {
    const value = prepared('duplicate-apply');
    const input = { identity: value.snapshot().identity, resultingRevision: 5 };
    value.apply(input);
    value.apply(input);
  },
  'rollback-foreign-identity': () => {
    const value = prepared('foreign-rollback');
    value.rollback({ commitReceipt: null, identity: identity('other-rollback'), resultingRevision: 4 });
  },
  'rollback-wrong-revision': () => {
    const value = prepared('wrong-rollback-revision');
    value.rollback({ commitReceipt: null, identity: value.snapshot().identity, resultingRevision: 5 });
  },
  'unapplied-commit-receipt': () => {
    const value = prepared('unapplied-receipt');
    const other = prepared('unapplied-receipt-other');
    const receipt = other.apply({ identity: other.snapshot().identity, resultingRevision: 5 });
    value.rollback({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 4 });
  },
  'applied-null-receipt': () => {
    const value = prepared('applied-null');
    value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.rollback({ commitReceipt: null, identity: value.snapshot().identity, resultingRevision: 4 });
  },
  'cross-preparation-commit-receipt': () => {
    const value = prepared('cross-commit');
    const other = prepared('cross-commit-other');
    value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    const receipt = other.apply({ identity: other.snapshot().identity, resultingRevision: 5 });
    value.finalize({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 5 });
  },
  'stale-same-scope-commit-receipt': () => {
    const sharedIdentity = identity('stale-same-scope');
    const sharedCandidate = immutableCandidate('stale-same-scope');
    const input = {
      baseRevision: 4,
      candidate: sharedCandidate,
      identity: sharedIdentity,
      participant: 'chart',
      preparedRevision: 4,
      schemaVersion: 1,
    };
    const stale = createPreparedCommit(input);
    const current = createPreparedCommit(input);
    const staleReceipt = stale.apply({ identity: sharedIdentity, resultingRevision: 5 });
    current.apply({ identity: sharedIdentity, resultingRevision: 5 });
    current.finalize({
      commitReceipt: staleReceipt,
      identity: sharedIdentity,
      resultingRevision: 5,
    });
  },
  'finalize-before-apply': () => {
    const value = prepared('early-finalize');
    value.finalize({ commitReceipt: null, identity: value.snapshot().identity, resultingRevision: 5 });
  },
  'finalize-wrong-revision': () => {
    const value = prepared('wrong-finalize-revision');
    const receipt = value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.finalize({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 4 });
  },
  'finalize-foreign-identity': () => {
    const value = prepared('foreign-finalize');
    const receipt = value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.finalize({ commitReceipt: receipt, identity: identity('other-finalize'), resultingRevision: 5 });
  },
  'rollback-after-finalize': () => {
    const value = prepared('rollback-after-finalize');
    const receipt = value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.finalize({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 5 });
    value.rollback({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 4 });
  },
  'finalize-after-rollback': () => {
    const value = prepared('finalize-after-rollback');
    const receipt = value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.rollback({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 4 });
    value.finalize({ commitReceipt: receipt, identity: value.snapshot().identity, resultingRevision: 5 });
  },
  'dispose-applied': () => {
    const value = prepared('dispose-applied');
    value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
    value.dispose();
  },
  'apply-after-dispose': () => {
    const value = prepared('apply-disposed');
    value.dispose();
    value.apply({ identity: value.snapshot().identity, resultingRevision: 5 });
  },
  'forged-commit-receipt': () => readPreparedCommitReceipt({ status: 'applied' }),
  'forged-rollback-receipt': () => readPreparedRollbackReceipt({ status: 'rolled-back' }),
  'forged-finalize-receipt': () => readPreparedFinalizeReceipt({ status: 'finalized' }),
  'cross-rollback-receipt': () => {
    const first = prepared('cross-rollback-first');
    const second = prepared('cross-rollback-second');
    const receipt = first.rollback({
      commitReceipt: null, identity: first.snapshot().identity, resultingRevision: 4,
    });
    requireMatchingPreparedRollbackReceipt(receipt, second);
  },
  'cross-finalize-receipt': () => {
    const first = prepared('cross-finalize-first');
    const second = prepared('cross-finalize-second');
    const commit = first.apply({ identity: first.snapshot().identity, resultingRevision: 5 });
    const receipt = first.finalize({
      commitReceipt: commit, identity: first.snapshot().identity, resultingRevision: 5,
    });
    requireMatchingPreparedFinalizeReceipt(receipt, second);
  },
};

assert.equal(negativeCases.length, 31);
for (const testCase of negativeCases) {
  assert.throws(
    negativeActions[testCase.case],
    (error) => error?.code === testCase.expectedCode,
    `${testCase.case} must fail with ${testCase.expectedCode}`,
  );
}
assert.throws(
  () => prepared('typed-error', { participant: 'unknown' }),
  (error) => error instanceof PreparedCommitContractError,
);

let dynamicPayload = Object.freeze({ revision: 1 });
const dynamicCandidate = {};
Object.defineProperty(dynamicCandidate, 'payload', {
  enumerable: true,
  get: () => dynamicPayload,
});
Object.freeze(dynamicCandidate);
prepared('dynamic-frozen-candidate', { candidate: dynamicCandidate });
dynamicPayload = {};
assert.throws(
  () => prepared('dynamic-mutable-candidate', { candidate: dynamicCandidate }),
  (error) => error?.code === 'PREPARED_COMMIT_CANDIDATE_IMMUTABLE',
  'accessor-backed candidates must be revalidated instead of entering the immutable cache',
);

console.log('v7 Prepared Commit contract harness passed (4 participants, 33 negative controls)');
