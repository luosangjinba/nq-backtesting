import { ReplayContractError } from './replay-error.js';

export function requireEpochMs(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ReplayContractError(
      'REPLAY_EPOCH_MS_INVALID',
      `${field} must be a non-negative safe-integer epoch millisecond.`,
    );
  }
  return value;
}

export function requirePositiveDurationMs(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ReplayContractError(
      'REPLAY_DURATION_INVALID',
      'Replay duration must be a positive safe integer.',
    );
  }
  return value;
}
