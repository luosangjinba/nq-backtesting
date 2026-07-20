import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  WorkspaceTransactionContractError,
  assessWorkspaceTransactionCurrency,
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  createWorkspaceTransactionPlan,
  describeWorkspaceTransactionEnvelope,
  requireWorkspaceTransactionIdentity,
  settleWorkspaceTransaction,
  workspaceTransactionIdentitiesEqual,
} from '../src/workspace-transaction-contract/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/workspace-transaction-contract/negative/cases.json'),
  'utf8',
));

const sessionA = createSessionId('session-A');
const sessionB = createSessionId('session-B');
const generation1 = createActivationGeneration(1);
const generation2 = createActivationGeneration(2);
const transaction1 = createTransactionId('tx-1');
const transaction2 = createTransactionId('tx-2');

function identity(overrides = {}) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: generation1,
    sessionId: sessionA,
    transactionId: transaction1,
    ...overrides,
  });
}

const current = identity({ transactionId: transaction2 });
const equivalentCurrent = identity({ transactionId: createTransactionId('tx-2') });
const oldTransaction = identity();
const oldActivation = identity({ activationGeneration: generation2, transactionId: transaction2 });
const otherSession = identity({ sessionId: sessionB, transactionId: transaction2 });

assert.equal(Object.isFrozen(current), true, 'complete transaction identity must be immutable');
assert.equal(requireWorkspaceTransactionIdentity(current), current);
assert.equal(workspaceTransactionIdentitiesEqual(current, equivalentCurrent), true);
assert.equal(workspaceTransactionIdentitiesEqual(current, oldTransaction), false);
assert.deepEqual(assessWorkspaceTransactionCurrency({ candidate: current, current }), {
  allowedSideEffects: ['commit'],
  reason: null,
  status: 'current',
});
assert.equal(Object.isFrozen(
  assessWorkspaceTransactionCurrency({ candidate: current, current }).allowedSideEffects,
), true);

const expectedStaleReasons = new Map([
  [oldTransaction, 'transaction-mismatch'],
  [oldActivation, 'activation-mismatch'],
  [otherSession, 'session-mismatch'],
]);
for (const candidates of [
  [oldTransaction, oldActivation, otherSession],
  [otherSession, oldTransaction, oldActivation],
  [oldActivation, otherSession, oldTransaction],
]) {
  for (const candidate of candidates) {
    const decision = assessWorkspaceTransactionCurrency({ candidate, current });
    assert.deepEqual(decision, {
      allowedSideEffects: [],
      reason: expectedStaleReasons.get(candidate),
      status: 'stale',
    });
    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.allowedSideEffects), true);
  }
}

const intent = createWorkspaceTransactionIntent({ identity: current, operation: 'manual-next' });
const plan = createWorkspaceTransactionPlan(intent);
assert.deepEqual(describeWorkspaceTransactionEnvelope(intent), {
  code: null, identity: current, operation: 'manual-next', phase: 'intent', status: null,
});
assert.deepEqual(describeWorkspaceTransactionEnvelope(plan), {
  code: null, identity: current, operation: 'manual-next', phase: 'plan', status: null,
});
for (const status of ['committed', 'rejected', 'stale', 'failed', 'cancelled']) {
  const terminal = settleWorkspaceTransaction(plan, {
    code: status === 'committed' ? null : `${status}-reason`,
    status,
  });
  const description = describeWorkspaceTransactionEnvelope(terminal);
  assert.equal(Object.isFrozen(terminal), true);
  assert.equal(description.phase, 'terminal');
  assert.equal(description.status, status);
  assert.equal(description.identity, current);
}

const validPlan = plan;
const committed = settleWorkspaceTransaction(validPlan, { status: 'committed' });
const negativeOperations = {
  'raw-session': () => createWorkspaceTransactionIdentity({
    activationGeneration: generation1, sessionId: 'session-A', transactionId: transaction1,
  }),
  'raw-generation': () => createWorkspaceTransactionIdentity({
    activationGeneration: 1, sessionId: sessionA, transactionId: transaction1,
  }),
  'raw-transaction': () => createWorkspaceTransactionIdentity({
    activationGeneration: generation1, sessionId: sessionA, transactionId: 'tx-1',
  }),
  'identity-lookalike': () => requireWorkspaceTransactionIdentity({
    activationGeneration: generation1, sessionId: sessionA, transactionId: transaction1,
  }),
  'invalid-operation': () => createWorkspaceTransactionIntent({ identity: current, operation: 'Manual Next' }),
  'plan-lookalike': () => createWorkspaceTransactionPlan({ identity: current, phase: 'intent' }),
  'terminal-status': () => settleWorkspaceTransaction(validPlan, { status: 'painted' }),
  'committed-code': () => settleWorkspaceTransaction(validPlan, { code: 'unexpected', status: 'committed' }),
  'failure-no-code': () => settleWorkspaceTransaction(validPlan, { status: 'failed' }),
  'settle-terminal': () => settleWorkspaceTransaction(committed, { status: 'committed' }),
};

for (const fixture of negativeCases) {
  assert.throws(
    negativeOperations[fixture.operation],
    (error) => error?.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`,
  );
}
assert.throws(
  () => requireWorkspaceTransactionIdentity(Object.create(Object.getPrototypeOf(current))),
  (error) => error instanceof WorkspaceTransactionContractError
    && error.code === 'WORKSPACE_TRANSACTION_IDENTITY_REQUIRED',
  'a prototype-forged tuple must not acquire the complete identity brand',
);

console.log(`v7 workspace transaction contract harness passed (${negativeCases.length + 1} negative controls)`);
