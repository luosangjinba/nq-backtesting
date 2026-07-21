import { ReplayContractError } from './replay-error.js';

const STEP_FIELDS = Object.freeze(['durationMs', 'id', 'offsetMs', 'sourceDurationMs']);

class ReplayStepValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function positiveSafeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ReplayContractError('REPLAY_STEP_DURATION_INVALID', `${field} must be a positive safe integer.`);
  }
  return value;
}

/**
 * Defines one global Replay bar-step grid independently from every Pane's
 * display timeframe. The grid is provider- and chart-neutral.
 */
export function createReplayStep(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...STEP_FIELDS].sort().join(',')) {
    throw new ReplayContractError(
      'REPLAY_STEP_FIELDS_INVALID',
      'Replay step must contain exactly durationMs, id, offsetMs, and sourceDurationMs.',
    );
  }
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.trim() !== value.id) {
    throw new ReplayContractError('REPLAY_STEP_ID_INVALID', 'Replay step id must be an exact non-empty string.');
  }
  const durationMs = positiveSafeInteger(value.durationMs, 'durationMs');
  const sourceDurationMs = positiveSafeInteger(value.sourceDurationMs, 'sourceDurationMs');
  if (durationMs < sourceDurationMs || durationMs % sourceDurationMs !== 0) {
    throw new ReplayContractError(
      'REPLAY_STEP_SOURCE_INCOMPATIBLE',
      'Replay step duration must be a source-duration multiple.',
    );
  }
  if (!Number.isSafeInteger(value.offsetMs) || value.offsetMs < 0
    || value.offsetMs >= durationMs || value.offsetMs % sourceDurationMs !== 0) {
    throw new ReplayContractError(
      'REPLAY_STEP_OFFSET_INVALID',
      'Replay step offset must be source-aligned and below the step duration.',
    );
  }
  return new ReplayStepValue({
    durationMs,
    id: value.id,
    offsetMs: value.offsetMs,
    sourceDurationMs,
  });
}

/** Reject unbranded structural lookalikes at Replay owner boundaries. */
export function readReplayStep(candidate) {
  if (!(candidate instanceof ReplayStepValue)) {
    throw new ReplayContractError('REPLAY_STEP_REQUIRED', 'A branded Replay step is required.');
  }
  return candidate.read();
}
