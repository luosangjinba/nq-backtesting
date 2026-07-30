import { readPaneWorkspace } from '../pane-workspace-domain/public.js';
import { readWorkspaceCheckpoint } from '../workspace-checkpoint-domain/public.js';
import { requireWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { failWorkspaceState } from './runtime-error.js';

class WorkspaceStateSnapshotValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function requireRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failWorkspaceState(
      'WORKSPACE_STATE_REVISION_INVALID',
      'Workspace State revision must be a non-negative safe integer.',
    );
  }
  return value;
}

/** Create the runtime's identity- and revision-bound accepted semantic snapshot. */
export function createWorkspaceStateSnapshot({
  checkpoint,
  identity,
  paneWorkspace,
  revision,
  sessionHours,
}) {
  readPaneWorkspace(paneWorkspace);
  readWorkspaceCheckpoint(checkpoint);
  return new WorkspaceStateSnapshotValue({
    checkpoint,
    identity: requireWorkspaceTransactionIdentity(identity),
    paneWorkspace,
    revision: requireRevision(revision),
    schemaVersion: 1,
    sessionHours,
  });
}

/** Reject structural lookalikes and expose one immutable accepted state value. */
export function readWorkspaceStateSnapshot(candidate) {
  if (!(candidate instanceof WorkspaceStateSnapshotValue)) {
    failWorkspaceState(
      'WORKSPACE_STATE_SNAPSHOT_REQUIRED',
      'A branded Workspace State snapshot is required.',
    );
  }
  return candidate.read();
}
