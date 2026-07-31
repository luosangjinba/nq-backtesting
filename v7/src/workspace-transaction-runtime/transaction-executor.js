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

function safeReject(replayPort, proposal) {
  if (proposal === null) return;
  try {
    replayPort.reject(proposal);
  } catch {
    // Rejection is cleanup only and cannot replace the transaction terminal result.
  }
}

function safeCleanup(method, value) {
  try { method(value); } catch { /* Cleanup cannot replace the terminal result. */ }
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
  const chart = prepared.participants[0];
  chart.receipt = await chart.handle.apply();
  assertCurrent(state, description.identity);
  for (const entry of prepared.participants.slice(1)) {
    entry.receipt = requireSynchronous(entry.handle.apply(), entry.participant, 'apply');
  }
  // Protected invariant — atomic-commit: every non-Chart owner applies and all
  // participants finalize in the same synchronous turn after the Chart paint gate.
  for (const entry of prepared.participants) {
    requireSynchronous(entry.handle.finalize(entry.receipt), entry.participant, 'finalize');
  }
}

async function rollbackPreparedTransaction(prepared) {
  if (prepared === null) return;
  for (const entry of [...prepared.participants].reverse()) {
    const status = entry.handle.snapshot().status;
    if (status !== 'prepared' && status !== 'applied') continue;
    try {
      const result = entry.handle.rollback(status === 'applied' ? entry.receipt : null);
      if (entry.participant === 'chart') await result;
      else requireSynchronous(result, entry.participant, 'rollback');
    } catch {
      // Continue restoring every other owner; the first transaction failure remains authoritative.
    }
  }
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
  let committed = false;
  try {
    await prepareTransaction({
      description, immutableInput, ports, prepared, record, semantic, state,
    });
    await applyPreparedTransaction({ description, prepared, state });
    committed = true;
    return settleWorkspaceTransaction(plan, { status: 'committed' });
  } catch (error) {
    if (!committed) {
      await rollbackPreparedTransaction(prepared);
      safeReject(ports.replayPort, record.proposal);
      safeCleanup(ports.workspaceStatePort.reject.bind(ports.workspaceStatePort), description.identity);
      safeCleanup(ports.publicationPort.reject.bind(ports.publicationPort), description.identity);
    }
    return failureTerminal({ description, error, plan, state });
  } finally {
    state.finish(record);
  }
}
