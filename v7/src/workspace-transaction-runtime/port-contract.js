import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

const REQUIRED_REPLAY_METHODS = ['commitVisible', 'propose', 'reject'];

function requireMethod(port, method, code) {
  if (!port || typeof port[method] !== 'function') {
    throw new WorkspaceTransactionRuntimeError(code, `Injected port must provide ${method}().`);
  }
}

/** Validate only the public operations the headless coordinator is allowed to invoke. */
export function requireWorkspaceTransactionPorts({
  acquisitionPort,
  projectionPort,
  replayPort,
  visibleCompletionPort,
}) {
  for (const method of REQUIRED_REPLAY_METHODS) {
    requireMethod(replayPort, method, 'WORKSPACE_REPLAY_PORT');
  }
  requireMethod(acquisitionPort, 'acquire', 'WORKSPACE_ACQUISITION_PORT');
  requireMethod(projectionPort, 'project', 'WORKSPACE_PROJECTION_PORT');
  requireMethod(visibleCompletionPort, 'present', 'WORKSPACE_VISIBLE_COMPLETION_PORT');
  return Object.freeze({ acquisitionPort, projectionPort, replayPort, visibleCompletionPort });
}

/** Runtime payloads are opaque to the coordinator but must be immutable. */
export function requireImmutableTransactionInput(candidate) {
  if (!candidate || typeof candidate !== 'object' || !Object.isFrozen(candidate)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_TRANSACTION_INPUT_IMMUTABLE',
      'Workspace transaction input must be a frozen object.',
    );
  }
  return candidate;
}
