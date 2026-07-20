import { ReplayContractError } from './replay-error.js';
import { requireEpochMs } from './time-value.js';

export function createReplayRange({ startEpochMs, endEpochMs }) {
  const start = requireEpochMs(startEpochMs, 'startEpochMs');
  const end = requireEpochMs(endEpochMs, 'endEpochMs');
  if (end <= start) {
    throw new ReplayContractError(
      'REPLAY_RANGE_ORDER',
      'Replay end must be later than Replay start.',
    );
  }
  return Object.freeze({ startEpochMs: start, endEpochMs: end });
}

export function requireCursorInRange(cursorEpochMs, range) {
  const cursor = requireEpochMs(cursorEpochMs, 'cursorEpochMs');
  const acceptedRange = createReplayRange(range);
  if (cursor < acceptedRange.startEpochMs || cursor > acceptedRange.endEpochMs) {
    throw new ReplayContractError(
      'REPLAY_CURSOR_OUT_OF_RANGE',
      'Replay cursor must remain inside the activated Session range.',
    );
  }
  return cursor;
}
