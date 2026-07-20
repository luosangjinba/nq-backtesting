import {
  activationGenerationsEqual,
  requireActivationGeneration,
} from '../activation-generation/public.js';
import { requireSessionId, sessionIdsEqual } from '../session-identity/public.js';
import { readWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { ReplayRuntimeError } from './runtime-error.js';

export function createReplayActivation({ sessionId, activationGeneration }) {
  return Object.freeze({
    activationGeneration: requireActivationGeneration(activationGeneration),
    sessionId: requireSessionId(sessionId),
  });
}

export function requireMatchingActivation(identity, activation) {
  const parts = readWorkspaceTransactionIdentity(identity);
  if (!sessionIdsEqual(parts.sessionId, activation.sessionId)) {
    throw new ReplayRuntimeError(
      'REPLAY_SESSION_MISMATCH',
      'Replay transaction belongs to another Session.',
    );
  }
  if (!activationGenerationsEqual(parts.activationGeneration, activation.activationGeneration)) {
    throw new ReplayRuntimeError(
      'REPLAY_ACTIVATION_MISMATCH',
      'Replay transaction belongs to another activation generation.',
    );
  }
  return identity;
}
