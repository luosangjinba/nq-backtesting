import { requireWorkspaceTransactionPorts } from './port-contract.js';
import { createWorkspaceTransactionRuntimeState } from './runtime-state.js';
import { executeWorkspaceTransaction } from './transaction-executor.js';

/**
 * Owner: Workspace Transaction Runtime.
 * Purpose: construct one isolated headless coordinator for a Session activation.
 * Inputs: branded scope, optional frozen accepted snapshot, and injected public owner ports.
 * Outputs: frozen execute/snapshot/dispose API.
 * Side effects: owns transaction cancellation and accepted workspace revision only.
 * Errors: stable WorkspaceTransactionRuntimeError or dependency contract errors.
 */
export function createWorkspaceTransactionRuntime({
  activationGeneration,
  acquisitionPort,
  initialAcceptedSnapshot = null,
  projectionPort,
  replayPort,
  sessionId,
  visibleCompletionPort,
}) {
  const ports = requireWorkspaceTransactionPorts({
    acquisitionPort,
    projectionPort,
    replayPort,
    visibleCompletionPort,
  });
  const state = createWorkspaceTransactionRuntimeState({
    activationGeneration,
    initialAcceptedSnapshot,
    sessionId,
  });
  return Object.freeze({
    dispose: () => state.dispose(),
    execute: (request) => executeWorkspaceTransaction({ ...request, ports, state }),
    snapshot: () => state.snapshot(),
  });
}
