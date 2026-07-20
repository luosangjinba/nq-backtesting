import {
  readWorkspaceTransactionIdentity,
  workspaceTransactionIdentitiesEqual,
} from '../workspace-transaction-contract/public.js';
import { failChartApplication } from './application-error.js';

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
    failChartApplication(
      'WORKSPACE_SNAPSHOT_IMMUTABLE',
      'A workspace snapshot must be a frozen object.',
    );
  }
  return candidate;
}

/** Create an opaque acknowledgement for one exact visible immutable snapshot. */
export function createVisibleCompletionAcknowledgement({ identity, workspaceSnapshot }) {
  readWorkspaceTransactionIdentity(identity);
  return new VisibleCompletionValue(identity, requireImmutableSnapshot(workspaceSnapshot));
}

/** Validate acknowledgement identity and exact snapshot provenance. */
export function requireMatchingVisibleCompletion(candidate, { identity, workspaceSnapshot }) {
  if (!(candidate instanceof VisibleCompletionValue)) {
    failChartApplication(
      'VISIBLE_COMPLETION_REQUIRED',
      'A branded visible-completion acknowledgement is required.',
    );
  }
  const value = candidate.read();
  if (!workspaceTransactionIdentitiesEqual(value.identity, identity)) {
    failChartApplication(
      'VISIBLE_COMPLETION_IDENTITY_MISMATCH',
      'Visible completion belongs to another workspace transaction.',
    );
  }
  if (value.workspaceSnapshot !== workspaceSnapshot) {
    failChartApplication(
      'VISIBLE_COMPLETION_SNAPSHOT_MISMATCH',
      'Visible completion belongs to another workspace snapshot.',
    );
  }
  return candidate;
}
