/** Public facade for durable, data-independent Session Workspace checkpoints. */
export { WorkspaceCheckpointDomainError } from './domain-error.js';
export {
  createWorkspaceCheckpoint,
  deserializeWorkspaceCheckpoint,
  readWorkspaceCheckpoint,
  serializeWorkspaceCheckpoint,
} from './workspace-checkpoint.js';
