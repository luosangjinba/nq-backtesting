import { failPreparedCommit } from './contract-error.js';

export const PREPARED_COMMIT_PARTICIPANTS = Object.freeze([
  'chart',
  'replay',
  'workspace-state',
  'publication',
]);

/** Require one of the four global Workspace commit participant roles. */
export function requirePreparedCommitParticipant(value) {
  if (!PREPARED_COMMIT_PARTICIPANTS.includes(value)) {
    failPreparedCommit(
      'PREPARED_COMMIT_PARTICIPANT_INVALID',
      'Prepared Commit participant must be Chart, Replay, Workspace State, or publication.',
    );
  }
  return value;
}
