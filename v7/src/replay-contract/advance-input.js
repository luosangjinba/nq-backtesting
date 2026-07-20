import { ReplayContractError } from './replay-error.js';
import { requirePositiveDurationMs } from './time-value.js';

const SOURCES = new Set(['manual', 'auto']);

/**
 * Describes time advancement, never a number of display candles.
 * Projection later reveals every eligible source bar in the advanced window.
 */
export function createReplayAdvanceInput({ source, durationMs }) {
  if (!SOURCES.has(source)) {
    throw new ReplayContractError(
      'REPLAY_ADVANCE_SOURCE_INVALID',
      'Replay advance source must be manual or auto.',
    );
  }
  return Object.freeze({
    durationMs: requirePositiveDurationMs(durationMs),
    source,
  });
}

export function requireReplayAdvanceInput(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ReplayContractError(
      'REPLAY_ADVANCE_INPUT_REQUIRED',
      'A Replay advance input is required.',
    );
  }
  const normalized = createReplayAdvanceInput(candidate);
  if (candidate.source !== normalized.source || candidate.durationMs !== normalized.durationMs) {
    throw new ReplayContractError(
      'REPLAY_ADVANCE_INPUT_REQUIRED',
      'A valid Replay advance input is required.',
    );
  }
  return candidate;
}
