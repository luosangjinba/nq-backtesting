import {
  createWorkspaceTransactionPlan,
  describeWorkspaceTransactionEnvelope,
  settleWorkspaceTransaction,
} from '../workspace-transaction-contract/public.js';
import { requireMatchingVisibleCompletion } from '../chart-snapshot-application/public.js';
import { workspaceTransactionFailureCode } from './failure-code.js';
import { requireImmutableTransactionInput } from './port-contract.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

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

async function prepareVisibleResult({ description, immutableInput, ports, record, state }) {
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
  const workspaceSnapshot = await ports.projectionPort.project(Object.freeze({
    acquired,
    identity: description.identity,
    input: immutableInput,
    operation: description.operation,
    proposal,
    signal: record.controller.signal,
  }));
  if (!workspaceSnapshot || typeof workspaceSnapshot !== 'object'
    || !Object.isFrozen(workspaceSnapshot)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_PROJECTION_IMMUTABLE',
      'Projection port must return a frozen workspace snapshot.',
    );
  }
  assertCurrent(state, description.identity);
  const acknowledgement = await ports.visibleCompletionPort.present(Object.freeze({
    identity: description.identity,
    operation: description.operation,
    signal: record.controller.signal,
    workspaceSnapshot,
  }));
  requireMatchingVisibleCompletion(acknowledgement, {
    identity: description.identity,
    workspaceSnapshot,
  });
  return Object.freeze({ proposal, workspaceSnapshot });
}

function commitPreparedResult({ description, ports, prepared, state }) {
  // Protected invariant: this is the final currency check immediately before
  // the synchronous accepted-state publication turn.
  const decision = state.preparePublication(description.identity);
  if (decision.status !== 'current') {
    throw new RuntimeInterruption(decision.status, decision.code);
  }
  const replay = ports.replayPort.commitVisible(prepared.proposal, prepared.workspaceSnapshot);
  state.publish({
    identity: description.identity,
    operation: description.operation,
    replay,
    workspace: prepared.workspaceSnapshot,
  });
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
export async function executeWorkspaceTransaction({ input, intent, ports, state }) {
  const description = requireIntent(intent);
  const immutableInput = requireImmutableTransactionInput(input);
  const record = state.begin(description.identity);
  const plan = createWorkspaceTransactionPlan(intent);
  let prepared = null;
  let committed = false;
  try {
    prepared = await prepareVisibleResult({ description, immutableInput, ports, record, state });
    commitPreparedResult({ description, ports, prepared, state });
    committed = true;
    return settleWorkspaceTransaction(plan, { status: 'committed' });
  } catch (error) {
    if (!committed) safeReject(ports.replayPort, record.proposal);
    return failureTerminal({ description, error, plan, state });
  } finally {
    state.finish(record);
  }
}
