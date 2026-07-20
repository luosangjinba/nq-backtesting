import { evaluateSessionHours } from './eligibility.js';
import { failSessionHours } from './session-hours-error.js';
import { exactRecord, freezeSourceEpochs, requireEpochMs, requireMode } from './validation.js';

function eligible(calendar, instrumentId, mode, epochMs) {
  return evaluateSessionHours({ calendar, instrumentId, mode, startEpochMs: epochMs }).eligible;
}

/** Resolve the latest actually-present eligible bar below an exclusive cursor. */
export function resolveVisibleThrough(value) {
  exactRecord(value, ['calendar', 'exclusiveCursorEpochMs', 'instrumentId', 'mode', 'sourceEpochs'], 'visibleThrough');
  const mode = requireMode(value.mode);
  const cursor = requireEpochMs(value.exclusiveCursorEpochMs, 'exclusiveCursorEpochMs');
  const epochs = freezeSourceEpochs(value.sourceEpochs);
  for (let index = epochs.length - 1; index >= 0; index -= 1) {
    const epochMs = epochs[index];
    if (epochMs < cursor && eligible(value.calendar, value.instrumentId, mode, epochMs)) return epochMs;
  }
  return null;
}

/** Resolve the next/previous actually-present eligible source bar without synthesis. */
export function resolveEligibleTraversal(value) {
  exactRecord(value, ['calendar', 'direction', 'fromEpochMs', 'instrumentId', 'mode', 'sourceEpochs'], 'traversal');
  if (value.direction !== 'next' && value.direction !== 'previous') {
    failSessionHours('SESSION_HOURS_DIRECTION_INVALID', 'direction must be next or previous.');
  }
  const mode = requireMode(value.mode);
  const from = requireEpochMs(value.fromEpochMs, 'fromEpochMs');
  const epochs = freezeSourceEpochs(value.sourceEpochs);
  const candidates = value.direction === 'next' ? epochs : [...epochs].reverse();
  return candidates.find((epochMs) => {
    const beyond = value.direction === 'next' ? epochMs > from : epochMs < from;
    return beyond && eligible(value.calendar, value.instrumentId, mode, epochMs);
  }) ?? null;
}
