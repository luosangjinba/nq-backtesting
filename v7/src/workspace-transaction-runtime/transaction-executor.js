import {
  createWorkspaceTransactionPlan,
  describeWorkspaceTransactionEnvelope,
  settleWorkspaceTransaction,
} from '../workspace-transaction-contract/public.js';
import { workspaceTransactionFailureCode } from './failure-code.js';
import { requirePreparedParticipant } from './participant-contract.js';
import { createPreparedPublication } from './prepared-publication.js';
import { requireImmutableTransactionInput } from './port-contract.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';
import { readWorkspaceSemanticCandidate } from './semantic-candidate.js';

class RuntimeInterruption extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function requireIntent(intent) {
  const description = describeWorkspaceTransactionEnvelope(intent);
  if (description.phase !== 'intent') {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_TRANSACTION_INTENT_REQUIRED',
      'Workspace Transaction Runtime accepts only branded intent envelopes.',
    );
  }
  return description;
}

function assertCurrent(state, identity) {
  const decision = state.currency(identity);
  if (decision.status !== 'current') {
    throw new RuntimeInterruption(decision.status, decision.code);
  }
}

function requireSynchronous(result, participant, operation) {
  if (result && typeof result.then === 'function') {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PARTICIPANT_MUST_BE_SYNCHRONOUS',
      `${participant} ${operation} must complete in the final synchronous commit turn.`,
    );
  }
  return result;
}

function requireImmutableProjection(workspaceSnapshot) {
  if (!workspaceSnapshot || typeof workspaceSnapshot !== 'object'
    || !Object.isFrozen(workspaceSnapshot)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PROJECTION_IMMUTABLE',
      'Projection port must return a frozen workspace snapshot.',
    );
  }
  return workspaceSnapshot;
}

async function prepareAuxiliaryParticipants({
  description, ports, prepared, record, state, workspaceSnapshot,
}) {
  for (const port of ports.auxiliaryPorts) {
    const participant = requirePreparedParticipant(await port.prepare(Object.freeze({
      identity: description.identity,
      operation: description.operation,
      signal: record.controller.signal,
      workspaceSnapshot,
    })), port.id, description.identity);
    prepared.participants.push(Object.seal({
      handle: participant, participant: port.id, receipt: null,
    }));
    assertCurrent(state, description.identity);
  }
}

async function prepareTransaction({ description, immutableInput, ports, prepared, record, semantic, state }) {
  const proposal = await ports.replayPort.propose(Object.freeze({
    identity: description.identity,
    input: immutableInput,
    operation: description.operation,
    signal: record.controller.signal,
  }));
  assertCurrent(state, description.identity);
  record.proposal = proposal;
  const acquired = await ports.acquisitionPort.acquire(Object.freeze({
    identity: description.identity,
    input: immutableInput,
    operation: description.operation,
    proposal,
    signal: record.controller.signal,
  }));
  assertCurrent(state, description.identity);
  const workspaceSnapshot = requireImmutableProjection(await ports.projectionPort.project(Object.freeze({
    acquired,
    identity: description.identity,
    input: immutableInput,
    operation: description.operation,
    proposal,
    signal: record.controller.signal,
  })));
  assertCurrent(state, description.identity);
  await prepareAuxiliaryParticipants({
    description, ports, prepared, record, state, workspaceSnapshot,
  });
  const chart = requirePreparedParticipant(await ports.chartPort.prepare(Object.freeze({
    identity: description.identity,
    operation: description.operation,
    signal: record.controller.signal,
    workspaceSnapshot,
  })), 'chart', description.identity);
  prepared.participants.push(Object.seal({ handle: chart, participant: 'chart', receipt: null }));
  assertCurrent(state, description.identity);
  const replay = requirePreparedParticipant(
    ports.replayPort.prepare(proposal, workspaceSnapshot, Object.freeze({ replayStep: semantic.replayStep })),
    'replay',
    description.identity,
  );
  prepared.participants.push(Object.seal({ handle: replay, participant: 'replay', receipt: null }));
  const replayCandidate = replay.snapshot().candidate;
  ports.workspaceStatePort.begin(description.identity);
  const workspaceState = requirePreparedParticipant(ports.workspaceStatePort.prepare(Object.freeze({
    cursorEpochMs: replayCandidate.cursorEpochMs,
    identity: description.identity,
    paneWorkspace: semantic.paneWorkspace,
    sessionHours: semantic.sessionHours,
  })), 'workspace-state', description.identity);
  prepared.participants.push(Object.seal({
    handle: workspaceState, participant: 'workspace-state', receipt: null,
  }));
  const publicationRevision = state.preparePublication(description.identity).targetRevision;
  const publicationCandidate = Object.freeze({
    identity: description.identity,
    operation: description.operation,
    publication: semantic.publication,
    replay: replayCandidate,
    revision: publicationRevision,
    schemaVersion: 1,
    workspace: workspaceSnapshot,
    workspaceState: workspaceState.snapshot().candidate,
  });
  const publication = requirePreparedParticipant(createPreparedPublication({
    candidate: publicationCandidate,
    identity: description.identity,
    port: ports.publicationPort,
    state,
  }), 'publication', description.identity);
  prepared.participants.push(Object.seal({
    handle: publication, participant: 'publication', receipt: null,
  }));
  prepared.proposal = proposal;
  prepared.workspaceSnapshot = workspaceSnapshot;
  return prepared;
}

async function applyPreparedTransaction({ description, prepared, state }) {
  assertCurrent(state, description.identity);
  const chart = prepared.participants.find(({ participant }) => participant === 'chart');
  const builtIn = new Set(['chart', 'publication', 'replay', 'workspace-state']);
  for (const entry of prepared.participants.filter(({ participant }) => !builtIn.has(participant))) {
    entry.receipt = requireSynchronous(entry.handle.apply(), entry.participant, 'apply');
    assertCurrent(state, description.identity);
  }
  chart.receipt = await chart.handle.apply();
  assertCurrent(state, description.identity);
  for (const entry of prepared.participants.filter(({ participant }) => (
    participant !== 'chart' && builtIn.has(participant)
  ))) {
    entry.receipt = requireSynchronous(entry.handle.apply(), entry.participant, 'apply');
  }
}

async function rollbackPreparedTransaction(prepared) {
  const failures = [];
  if (prepared === null) return failures;
  for (const entry of [...prepared.participants].reverse()) {
    let status;
    try {
      status = entry.handle.snapshot().status;
    } catch (error) {
      failures.push(Object.freeze({ error, participant: entry.participant }));
      continue;
    }
    if (status !== 'prepared' && status !== 'applied') continue;
    try {
      const result = entry.handle.rollback(status === 'applied' ? entry.receipt : null);
      if (entry.participant === 'chart') await result;
      else requireSynchronous(result, entry.participant, 'rollback');
    } catch (error) {
      failures.push(Object.freeze({ error, participant: entry.participant }));
    }
  }
  return failures;
}

function recordCleanupFailure(failures, participant, operation, callback) {
  try {
    requireSynchronous(callback(), participant, operation);
  } catch (error) {
    failures.push(Object.freeze({ error, participant }));
  }
}

async function restoreRejectedTransaction({ description, ports, prepared, proposal, state }) {
  const failures = await rollbackPreparedTransaction(prepared);
  if (proposal !== null) {
    recordCleanupFailure(failures, 'replay', 'reject', () => ports.replayPort.reject(proposal));
  }
  recordCleanupFailure(
    failures,
    'workspace-state',
    'reject',
    () => ports.workspaceStatePort.reject(description.identity),
  );
  recordCleanupFailure(
    failures,
    'publication',
    'reject',
    () => ports.publicationPort.reject(description.identity),
  );
  if (failures.length > 0) state.poison('workspace-transaction-recovery-failed');
  return failures;
}

function finalizePreparedTransaction({ description, prepared, state }) {
  const publication = prepared.participants.find(({ participant }) => participant === 'publication');
  const remaining = prepared.participants.filter(({ participant }) => participant !== 'publication');
  const failures = [];

  // Protected invariant — atomic-commit: publication publishes the accepted
  // coordinator snapshot first and is the sole irreversible decision point.
  // Failures before that point roll every participant back. Failures after it
  // cannot truthfully change the terminal result from committed; all remaining
  // owners receive a finalization attempt and the activation is poisoned when
  // any owner cannot prove completion.
  try {
    requireSynchronous(
      publication.handle.finalize(publication.receipt),
      publication.participant,
      'finalize',
    );
  } catch (error) {
    if (!state.isDecisionCommitted(description.identity)) throw error;
    failures.push(Object.freeze({ error, participant: publication.participant }));
  }

  if (!state.isDecisionCommitted(description.identity)) {
    state.poison('workspace-transaction-decision-missing');
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_TRANSACTION_COMMIT_DECISION_MISSING',
      'Publication finalized without publishing the Workspace commit decision.',
    );
  }

  for (const entry of remaining) {
    try {
      requireSynchronous(entry.handle.finalize(entry.receipt), entry.participant, 'finalize');
    } catch (error) {
      failures.push(Object.freeze({ error, participant: entry.participant }));
    }
  }
  if (failures.length > 0) state.poison('workspace-transaction-finalize-failed');
  return failures;
}

function failureTerminal({ description, error, plan, state }) {
  if (error instanceof RuntimeInterruption) {
    return settleWorkspaceTransaction(plan, { code: error.code, status: error.status });
  }
  if (state.isDisposed()) {
    return settleWorkspaceTransaction(plan, { code: 'runtime-disposed', status: 'cancelled' });
  }
  if (!state.matchesCurrent(description.identity)) {
    return settleWorkspaceTransaction(plan, { code: 'transaction-superseded', status: 'stale' });
  }
  return settleWorkspaceTransaction(plan, {
    code: workspaceTransactionFailureCode(error),
    status: 'failed',
  });
}

/** Execute one intent through injected owners and return exactly one terminal envelope. */
export async function executeWorkspaceTransaction({ input, intent, ports, semanticCandidate, state }) {
  const description = requireIntent(intent);
  const immutableInput = requireImmutableTransactionInput(input);
  const semantic = readWorkspaceSemanticCandidate(semanticCandidate);
  const record = state.begin(description.identity);
  const plan = createWorkspaceTransactionPlan(intent);
  let prepared = { participants: [], proposal: null, workspaceSnapshot: null };
  let decisionCommitted = false;
  try {
    await prepareTransaction({
      description, immutableInput, ports, prepared, record, semantic, state,
    });
    await applyPreparedTransaction({ description, prepared, state });
    finalizePreparedTransaction({ description, prepared, state });
    decisionCommitted = true;
    return settleWorkspaceTransaction(plan, { status: 'committed' });
  } catch (error) {
    decisionCommitted = decisionCommitted || state.isDecisionCommitted(description.identity);
    if (decisionCommitted) {
      state.poison('workspace-transaction-finalize-failed');
      return settleWorkspaceTransaction(plan, { status: 'committed' });
    }
    await restoreRejectedTransaction({
      description,
      ports,
      prepared,
      proposal: record.proposal,
      state,
    });
    return failureTerminal({ description, error, plan, state });
  } finally {
    state.finish(record);
  }
}
