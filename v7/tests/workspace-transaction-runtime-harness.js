import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createActivationGeneration } from '../src/activation-generation/public.js';
import { createReplayAdvanceInput, createReplayStep } from '../src/replay-contract/public.js';
import { createReplayRuntime } from '../src/replay-runtime/public.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createTransactionId } from '../src/transaction-identity/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../src/workspace-transaction-contract/public.js';
import { createPreparedCommit } from '../src/prepared-commit-contract/public.js';
import {
  createWorkspaceSemanticCandidate,
  createWorkspaceTransactionRuntime,
  WorkspaceTransactionRuntimeError,
} from '../src/workspace-transaction-runtime/public.js';

const sessionA = createSessionId('session-a');
const sessionB = createSessionId('session-b');
const generationOne = createActivationGeneration(1);
const generationTwo = createActivationGeneration(2);
const range = Object.freeze({ startEpochMs: 1_000, endEpochMs: 20_000 });
const advance = createReplayAdvanceInput({ source: 'manual', durationMs: 1_000 });
const replayStep = createReplayStep({
  durationMs: 1_000, id: 'replay-step.test', offsetMs: 0, sourceDurationMs: 1_000,
});
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/workspace-transaction-runtime/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.length, 18);
assert.equal(new Set(negativeCases).size, 18, 'negative/race controls must have stable unique names');

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

function semantic(label = 'default') {
  return createWorkspaceSemanticCandidate({
    paneWorkspace: Object.freeze({ label: `panes:${label}` }),
    publication: Object.freeze({ label: `publication:${label}` }),
    replayStep,
    sessionHours: Object.freeze({ label: `hours:${label}` }),
  });
}

function preparedOwner({ candidate, failApply = false, identity: transactionIdentity, participant, state, trace }) {
  const previous = Object.freeze({ revision: state.revision, value: state.value });
  const contract = createPreparedCommit({
    baseRevision: state.revision,
    candidate,
    identity: transactionIdentity,
    participant,
    preparedRevision: state.revision,
    schemaVersion: 1,
  });
  return Object.freeze({
    apply() {
      trace.push(`${participant}-apply`);
      if (failApply) throw new Error(`${participant} apply failed`);
      state.revision = contract.snapshot().targetRevision;
      state.value = candidate;
      return contract.apply({ identity: transactionIdentity, resultingRevision: state.revision });
    },
    dispose: () => contract.dispose(),
    finalize(receipt) {
      trace.push(`${participant}-finalize`);
      return contract.finalize({
        commitReceipt: receipt,
        identity: transactionIdentity,
        resultingRevision: state.revision,
      });
    },
    rollback(receipt = null) {
      trace.push(`${participant}-rollback`);
      const applied = contract.snapshot().status === 'applied';
      if (applied) {
        state.revision = previous.revision;
        state.value = previous.value;
      }
      return contract.rollback({
        commitReceipt: receipt,
        identity: transactionIdentity,
        resultingRevision: previous.revision,
      });
    },
    snapshot: () => contract.snapshot(),
  });
}

function terminal(result) {
  return describeWorkspaceTransactionEnvelope(result);
}

function fixture({
  acquire = async ({ input: value }) => Object.freeze({ label: value.label }),
  failParticipant = null,
  initialAcceptedSnapshot = null,
  project = async ({ acquired }) => Object.freeze({ bars: Object.freeze([acquired.label]) }),
} = {}) {
  const trace = [];
  const clock = createReplayRuntime({
    activationGeneration: generationOne,
    initialCursorEpochMs: 2_000,
    initialReplayStep: replayStep,
    range,
    sessionId: sessionA,
  });
  const replayPort = Object.freeze({
    prepare(proposal) {
      trace.push('replay-prepare');
      const prepared = clock.prepareVisible(proposal);
      return Object.freeze({
        apply() {
          trace.push('replay-apply');
          if (failParticipant === 'replay') throw new Error('replay apply failed');
          return prepared.apply();
        },
        dispose: prepared.dispose.bind(prepared),
        finalize(receipt) { trace.push('replay-finalize'); return prepared.finalize(receipt); },
        rollback(receipt) { trace.push('replay-rollback'); return prepared.rollback(receipt); },
        snapshot: prepared.snapshot.bind(prepared),
      });
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
  const chartState = { revision: 0, value: null };
  const workspaceState = { currentIdentity: null, revision: 0, value: null };
  const publicationState = { persistenceRevision: 0, revision: 0, value: null };
  const publicationStages = new WeakMap();
  const coordinator = createWorkspaceTransactionRuntime({
    activationGeneration: generationOne,
    acquisitionPort: Object.freeze({
      async acquire(context) {
        trace.push(`acquire:${context.input.label}`);
        return acquire(context);
      },
    }),
    chartPort: Object.freeze({
      async prepare(context) {
        trace.push('chart-prepare');
        return preparedOwner({
          candidate: context.workspaceSnapshot,
          failApply: failParticipant === 'chart',
          identity: context.identity,
          participant: 'chart',
          state: chartState,
          trace,
        });
      },
    }),
    initialAcceptedSnapshot,
    publicationPort: Object.freeze({
      apply(stage) {
        const record = publicationStages.get(stage);
        trace.push('publication-apply');
        if (failParticipant === 'publication') throw new Error('publication apply failed');
        record.state = 'applying';
        publicationState.revision += 1;
        publicationState.value = record.candidate;
        if (failParticipant === 'persistence') throw new Error('persistence write failed');
        publicationState.persistenceRevision += 1;
        record.state = 'applied';
      },
      finalize(stage) {
        trace.push('publication-finalize');
        publicationStages.get(stage).state = 'finalized';
      },
      reject() { trace.push('publication-reject'); },
      rollback(stage) {
        const record = publicationStages.get(stage);
        trace.push('publication-rollback');
        if (record.state === 'applying' || record.state === 'applied') {
          publicationState.revision = record.previous.revision;
          publicationState.persistenceRevision = record.previous.persistenceRevision;
          publicationState.value = record.previous.value;
        }
        record.state = 'rolled-back';
      },
      stage({ candidate }) {
        trace.push('publication-stage');
        const stage = Object.freeze({});
        publicationStages.set(stage, {
          candidate,
          previous: Object.freeze({ ...publicationState }),
          state: 'staged',
        });
        return stage;
      },
    }),
    projectionPort: Object.freeze({
      async project(context) {
        trace.push(`project:${context.input.label}`);
        return project(context);
      },
    }),
    replayPort,
    sessionId: sessionA,
    workspaceStatePort: Object.freeze({
      begin(transactionIdentity) {
        trace.push('workspace-state-begin');
        workspaceState.currentIdentity = transactionIdentity;
      },
      prepare({ identity: transactionIdentity, paneWorkspace, sessionHours }) {
        trace.push('workspace-state-prepare');
        return preparedOwner({
          candidate: Object.freeze({
            identity: transactionIdentity,
            paneWorkspace,
            revision: workspaceState.revision + 1,
            schemaVersion: 1,
            sessionHours,
          }),
          failApply: failParticipant === 'workspace-state',
          identity: transactionIdentity,
          participant: 'workspace-state',
          state: workspaceState,
          trace,
        });
      },
      reject() { workspaceState.currentIdentity = null; },
    }),
  });
  const runtime = Object.freeze({
    dispose: coordinator.dispose,
    execute(request) {
      return coordinator.execute({
        semanticCandidate: semantic(request.input?.label ?? 'default'),
        ...request,
      });
    },
    snapshot: coordinator.snapshot,
  });
  return { chartState, clock, publicationState, runtime, trace, workspaceState };
}

const success = fixture();
const committed = terminal(await success.runtime.execute({ input: input('success'), intent: intent('success') }));
assert.equal(committed.status, 'committed');
assert.deepEqual(success.trace, [
  'propose:success',
  'acquire:success',
  'project:success',
  'chart-prepare',
  'replay-prepare',
  'workspace-state-begin',
  'workspace-state-prepare',
  'publication-stage',
  'chart-apply',
  'replay-apply',
  'workspace-state-apply',
  'publication-apply',
  'chart-finalize',
  'replay-finalize',
  'workspace-state-finalize',
  'publication-finalize',
]);
assert.equal(success.clock.snapshot().cursorEpochMs, 3_000);
assert.equal(success.runtime.snapshot().acceptedRevision, 1);
assert.deepEqual(success.runtime.snapshot().acceptedSnapshot.workspace.bars, ['success']);

const previous = Object.freeze({ revision: 7, workspace: Object.freeze({ bars: Object.freeze(['old']) }) });
for (const failingStage of ['acquire', 'project', 'chart']) {
  const failure = fixture({
    acquire: failingStage === 'acquire' ? async () => { throw new Error('acquire failed'); } : undefined,
    initialAcceptedSnapshot: previous,
    failParticipant: failingStage === 'chart' ? 'chart' : null,
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

for (const failingParticipant of ['replay', 'workspace-state', 'publication', 'persistence']) {
  const failure = fixture({ failParticipant: failingParticipant, initialAcceptedSnapshot: previous });
  const result = terminal(await failure.runtime.execute({
    input: input(`participant-${failingParticipant}`),
    intent: intent(`participant-${failingParticipant}`),
  }));
  assert.equal(result.status, 'failed', `${failingParticipant} failure must terminate`);
  assert.equal(failure.runtime.snapshot().acceptedSnapshot, previous);
  assert.equal(failure.runtime.snapshot().acceptedRevision, 7);
  assert.equal(failure.clock.snapshot().cursorEpochMs, 2_000);
  assert.deepEqual(
    { revision: failure.chartState.revision, value: failure.chartState.value },
    { revision: 0, value: null },
    `${failingParticipant} failure must restore Chart exactly`,
  );
  assert.deepEqual(
    { revision: failure.workspaceState.revision, value: failure.workspaceState.value },
    { revision: 0, value: null },
    `${failingParticipant} failure must restore Workspace State exactly`,
  );
  assert.deepEqual(
    failure.publicationState,
    { persistenceRevision: 0, revision: 0, value: null },
    `${failingParticipant} failure must restore publication and persistence exactly`,
  );
}

const domainFailure = fixture({
  acquire: async () => {
    throw Object.assign(new Error('Anchor lookup failed.'), {
      code: 'REPLAY_NAVIGATION_ANCHOR_DISTANCE',
    });
  },
});
assert.equal(terminal(await domainFailure.runtime.execute({
  input: input('domain-failure'),
  intent: intent('domain-failure'),
})).code, 'replay-navigation-anchor-distance',
'uppercase owner error codes must remain observable through the lowercase terminal contract');

const providerFailure = fixture({
  acquire: async () => {
    throw Object.assign(new Error('Provider request failed.'), {
      code: 'PROVIDER_REQUEST_FAILED',
      kind: 'unavailable',
    });
  },
});
assert.equal(terminal(await providerFailure.runtime.execute({
  input: input('provider-failure'),
  intent: intent('provider-failure'),
})).code, 'provider-unavailable',
'provider failures must expose their bounded failure kind instead of a generic transaction code');

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

await assert.rejects(
  invalid.runtime.execute({
    input: input('semantic-lookalike'),
    intent: intent('semantic-lookalike'),
    semanticCandidate: Object.freeze({}),
  }),
  (error) => error?.code === 'WORKSPACE_SEMANTIC_CANDIDATE_REQUIRED',
);

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
