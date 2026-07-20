import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createReplayAdvanceInput } from '../src/replay-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import { createVisibleCompletionAcknowledgement } from '../src/chart-snapshot-application/public.js';
import {
  createWorkspaceTransactionRuntime,
  WorkspaceTransactionRuntimeError,
} from '../src/workspace-transaction-runtime/public.js';

const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);
const range = Object.freeze({ startEpochMs: 1_000, endEpochMs: 20_000 });
const advance = createReplayAdvanceInput({ source: 'manual', durationMs: 1_000 });
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-transaction-runtime/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.length, 14);
assert.equal(new Set(negativeCases).size, 14, 'negative/race controls must have stable unique names');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function identity(suffix, overrides = {}) {
  return createWorkspaceTransactionIdentity({
    activationGeneration: generationOne,
    sessionId: sessionA,
    transactionId: createTransactionId(`transaction-${suffix}`),
    ...overrides,
  });
}

function intent(suffix, overrides = {}) {
  return createWorkspaceTransactionIntent({
    identity: identity(suffix, overrides),
    operation: 'manual-next',
  });
}

function input(label = 'default') {
  return Object.freeze({ advance, label });
}

function terminal(result) {
  return describeWorkspaceTransactionEnvelope(result);
}

function fixture({
  acquire = async ({ input: value }) => Object.freeze({ label: value.label }),
  initialAcceptedSnapshot = null,
  present,
  project = async ({ acquired }) => Object.freeze({ bars: Object.freeze([acquired.label]) }),
} = {}) {
  const trace = [];
  const clock = createReplayRuntime({
    activationGeneration: generationOne,
    initialCursorEpochMs: 2_000,
    range,
    sessionId: sessionA,
  });
  const replayPort = Object.freeze({
    commitVisible(proposal) {
      trace.push('replay-commit');
      return clock.commitVisible(proposal);
    },
    propose({ identity: transactionIdentity, input: value }) {
      trace.push(`propose:${value.label}`);
      return clock.proposeAdvance({ advance: value.advance, identity: transactionIdentity });
    },
    reject(proposal) {
      trace.push('replay-reject');
      return clock.reject(proposal);
    },
  });
  const runtime = createWorkspaceTransactionRuntime({
    activationGeneration: generationOne,
    acquisitionPort: Object.freeze({
      async acquire(context) {
        trace.push(`acquire:${context.input.label}`);
        return acquire(context);
      },
    }),
    initialAcceptedSnapshot,
    projectionPort: Object.freeze({
      async project(context) {
        trace.push(`project:${context.input.label}`);
        return project(context);
      },
    }),
    replayPort,
    sessionId: sessionA,
    visibleCompletionPort: Object.freeze({
      async present(context) {
        trace.push(`present:${context.operation}`);
        assert.equal(
          clock.snapshot().cursorEpochMs,
          2_000,
          'Replay cursor must remain inert until visible completion returns',
        );
        if (present) return present(context);
        return createVisibleCompletionAcknowledgement({
          identity: context.identity,
          workspaceSnapshot: context.workspaceSnapshot,
        });
      },
    }),
  });
  return { clock, runtime, trace };
}

const success = fixture();
const committed = terminal(await success.runtime.execute({ input: input('success'), intent: intent('success') }));
assert.equal(committed.status, 'committed');
assert.deepEqual(success.trace, [
  'propose:success',
  'acquire:success',
  'project:success',
  'present:manual-next',
  'replay-commit',
]);
assert.equal(success.clock.snapshot().cursorEpochMs, 3_000);
assert.equal(success.runtime.snapshot().acceptedRevision, 1);
assert.deepEqual(success.runtime.snapshot().acceptedSnapshot.workspace.bars, ['success']);

const previous = Object.freeze({ revision: 7, workspace: Object.freeze({ bars: Object.freeze(['old']) }) });
for (const failingStage of ['acquire', 'project', 'present']) {
  const failure = fixture({
    acquire: failingStage === 'acquire' ? async () => { throw new Error('acquire failed'); } : undefined,
    initialAcceptedSnapshot: previous,
    present: failingStage === 'present' ? async () => { throw new Error('present failed'); } : undefined,
    project: failingStage === 'project' ? async () => { throw new Error('project failed'); } : undefined,
  });
  const result = terminal(await failure.runtime.execute({
    input: input(failingStage),
    intent: intent(`failure-${failingStage}`),
  }));
  assert.equal(result.status, 'failed', `${failingStage} failure must terminate`);
  assert.equal(failure.runtime.snapshot().acceptedSnapshot, previous);
  assert.equal(failure.runtime.snapshot().acceptedRevision, 7);
  assert.equal(failure.clock.snapshot().cursorEpochMs, 2_000);
}

const slowAcquisition = deferred();
let slowSignal;
const reordered = fixture({
  acquire: ({ input: value, signal }) => {
    if (value.label === 'slow') {
      slowSignal = signal;
      return slowAcquisition.promise;
    }
    return Promise.resolve(Object.freeze({ label: value.label }));
  },
});
const slowResultPromise = reordered.runtime.execute({ input: input('slow'), intent: intent('slow') });
await Promise.resolve();
const fastResult = terminal(await reordered.runtime.execute({ input: input('fast'), intent: intent('fast') }));
assert.equal(fastResult.status, 'committed');
assert.equal(slowSignal.aborted, true, 'supersession aborts stale work for cleanup');
slowAcquisition.resolve(Object.freeze({ label: 'slow' }));
const slowResult = terminal(await slowResultPromise);
assert.equal(slowResult.status, 'stale');
assert.equal(slowResult.code, 'transaction-mismatch');
assert.deepEqual(reordered.runtime.snapshot().acceptedSnapshot.workspace.bars, ['fast']);
assert.equal(reordered.clock.snapshot().cursorEpochMs, 3_000);

const staleFailureGate = deferred();
const staleFailure = fixture({
  acquire: ({ input: value }) => value.label === 'old-failure'
    ? staleFailureGate.promise
    : Promise.resolve(Object.freeze({ label: value.label })),
});
const oldFailurePromise = staleFailure.runtime.execute({
  input: input('old-failure'),
  intent: intent('old-failure'),
});
await Promise.resolve();
await staleFailure.runtime.execute({ input: input('new-success'), intent: intent('new-success') });
staleFailureGate.reject(new Error('late provider failure'));
assert.equal(terminal(await oldFailurePromise).status, 'stale', 'stale failures are observational only');

const disposeGate = deferred();
const disposing = fixture({ acquire: () => disposeGate.promise });
const cancelledPromise = disposing.runtime.execute({ input: input('dispose'), intent: intent('dispose') });
await Promise.resolve();
disposing.runtime.dispose();
disposeGate.resolve(Object.freeze({ label: 'dispose' }));
assert.equal(terminal(await cancelledPromise).status, 'cancelled');
assert.equal(disposing.clock.snapshot().cursorEpochMs, 2_000);

const wrongVisibleIdentity = fixture({
  present: async ({ workspaceSnapshot }) => createVisibleCompletionAcknowledgement({
    identity: identity('foreign-visible'),
    workspaceSnapshot,
  }),
});
assert.equal(terminal(await wrongVisibleIdentity.runtime.execute({
  input: input('wrong-visible'),
  intent: intent('wrong-visible'),
})).status, 'failed');
assert.equal(wrongVisibleIdentity.clock.snapshot().cursorEpochMs, 2_000);

const duplicate = fixture();
const duplicateIntent = intent('duplicate');
await duplicate.runtime.execute({ input: input('first'), intent: duplicateIntent });
await assert.rejects(
  duplicate.runtime.execute({ input: input('second'), intent: duplicateIntent }),
  (error) => error?.code === 'WORKSPACE_TRANSACTION_DUPLICATE',
);

for (const mismatch of [
  { code: 'WORKSPACE_RUNTIME_SESSION_MISMATCH', value: intent('other-session', { sessionId: sessionB }) },
  {
    code: 'WORKSPACE_RUNTIME_ACTIVATION_MISMATCH',
    value: intent('other-activation', { activationGeneration: generationTwo }),
  },
]) {
  const target = fixture();
  await assert.rejects(
    target.runtime.execute({ input: input('mismatch'), intent: mismatch.value }),
    (error) => error instanceof WorkspaceTransactionRuntimeError && error.code === mismatch.code,
  );
  assert.equal(target.clock.snapshot().cursorEpochMs, 2_000);
}

const invalid = fixture();
await assert.rejects(
  invalid.runtime.execute({ input: { advance }, intent: intent('mutable-input') }),
  (error) => error?.code === 'WORKSPACE_TRANSACTION_INPUT_IMMUTABLE',
);
const mutableProjection = fixture({ project: async () => ({ bars: [] }) });
assert.equal(terminal(await mutableProjection.runtime.execute({
  input: input('mutable-projection'),
  intent: intent('mutable-projection'),
})).status, 'failed');

assert.throws(
  () => fixture({ initialAcceptedSnapshot: Object.freeze({ revision: -1 }) }),
  (error) => error?.code === 'WORKSPACE_INITIAL_REVISION',
);

const exhausted = fixture({
  initialAcceptedSnapshot: Object.freeze({ revision: Number.MAX_SAFE_INTEGER }),
});
assert.equal(terminal(await exhausted.runtime.execute({
  input: input('revision-exhausted'),
  intent: intent('revision-exhausted'),
})).status, 'failed');
assert.equal(exhausted.clock.snapshot().cursorEpochMs, 2_000, 'preflight failure must not advance Replay');

console.log(`v7 Workspace Transaction Runtime harness passed (${negativeCases.length} negative/race controls)`);
