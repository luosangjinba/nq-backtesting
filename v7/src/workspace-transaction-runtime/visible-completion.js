import {
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

class VisibleCompletionValue {
  #value;

  constructor(identity, workspaceSnapshot) {
    this.#value = Object.freeze({ identity, workspaceSnapshot });
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function requireImmutableSnapshot(candidate) {
  if (!candidate || typeof candidate !== 'object' || !Object.isFrozen(candidate)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_SNAPSHOT_IMMUTABLE',
      'A workspace snapshot must be a frozen object.',
    );
  }
  return candidate;
}

/**
 * Owner: future Chart Runtime visible-completion adapter.
 * Purpose: acknowledge that one exact projected snapshot reached its visible boundary.
 * Inputs: complete transaction identity and the exact immutable projected snapshot.
 * Outputs: opaque frozen acknowledgement consumed once by the coordinator.
 * Side effects: none; creating an acknowledgement does not accept Replay or workspace state.
 */
export function createVisibleCompletionAcknowledgement({ identity, workspaceSnapshot }) {
  readWorkspaceTransactionIdentity(identity);
  return new VisibleCompletionValue(identity, requireImmutableSnapshot(workspaceSnapshot));
}

/** Validate acknowledgement identity and exact snapshot provenance. */
export function requireMatchingVisibleCompletion(
  candidate,
  { identity, workspaceSnapshot },
) {
  if (!(candidate instanceof VisibleCompletionValue)) {
    throw new WorkspaceTransactionRuntimeError(
      'VISIBLE_COMPLETION_REQUIRED',
      'A branded visible-completion acknowledgement is required.',
    );
  }
  let value;
  try {
    value = candidate.read();
  } catch {
    throw new WorkspaceTransactionRuntimeError(
      'VISIBLE_COMPLETION_REQUIRED',
      'A valid visible-completion acknowledgement is required.',
    );
  }
  if (!workspaceTransactionIdentitiesEqual(value.identity, identity)) {
    throw new WorkspaceTransactionRuntimeError(
      'VISIBLE_COMPLETION_IDENTITY_MISMATCH',
      'Visible completion belongs to another workspace transaction.',
    );
  }
  if (value.workspaceSnapshot !== workspaceSnapshot) {
    throw new WorkspaceTransactionRuntimeError(
      'VISIBLE_COMPLETION_SNAPSHOT_MISMATCH',
      'Visible completion belongs to another workspace snapshot.',
    );
  }
  return candidate;
}
