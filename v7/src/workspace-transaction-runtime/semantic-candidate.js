import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

const FIELDS = Object.freeze(['paneWorkspace', 'publication', 'replayStep', 'sessionHours']);

class WorkspaceSemanticCandidateValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function requireFrozenObject(value, field) {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_SEMANTIC_CANDIDATE_IMMUTABLE',
      `${field} must be an immutable owner value.`,
    );
  }
  return value;
}

/** Bind the exact semantic Pane/Session Hours proposal to one transaction execution. */
export function createWorkspaceSemanticCandidate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...FIELDS].sort().join(',')) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_SEMANTIC_CANDIDATE_INVALID',
      'Workspace semantic candidate fields are invalid.',
    );
  }
  return new WorkspaceSemanticCandidateValue({
    paneWorkspace: requireFrozenObject(value.paneWorkspace, 'paneWorkspace'),
    publication: requireFrozenObject(value.publication, 'publication'),
    replayStep: requireFrozenObject(value.replayStep, 'replayStep'),
    sessionHours: requireFrozenObject(value.sessionHours, 'sessionHours'),
  });
}

export function readWorkspaceSemanticCandidate(candidate) {
  if (!(candidate instanceof WorkspaceSemanticCandidateValue)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_SEMANTIC_CANDIDATE_REQUIRED',
      'A branded Workspace semantic candidate is required.',
    );
  }
  return candidate.read();
}
