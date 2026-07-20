import { requireWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { requireReplayAdvanceInput } from './advance-input.js';
import { ReplayContractError } from './replay-error.js';
import { createReplayRange, requireCursorInRange } from './replay-range.js';

class ReplayCursorProposalValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  value() {
    return this.#value;
  }
}

export function createReplayCursorProposal({
  identity,
  range,
  baseRevision,
  cursorEpochMs,
  advance,
}) {
  const acceptedRange = createReplayRange(range);
  const cursor = requireCursorInRange(cursorEpochMs, acceptedRange);
  requireWorkspaceTransactionIdentity(identity);
  requireReplayAdvanceInput(advance);
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) {
    throw new ReplayContractError(
      'REPLAY_BASE_REVISION_INVALID',
      'Replay proposal base revision must be a non-negative safe integer.',
    );
  }
  const unclampedTarget = cursor + advance.durationMs;
  if (!Number.isSafeInteger(unclampedTarget)) {
    throw new ReplayContractError(
      'REPLAY_TARGET_OVERFLOW',
      'Replay target exceeds safe integer time.',
    );
  }
  const targetEpochMs = Math.min(unclampedTarget, acceptedRange.endEpochMs);
  return new ReplayCursorProposalValue({
    advance,
    baseRevision,
    complete: targetEpochMs === acceptedRange.endEpochMs,
    cursorEpochMs,
    identity,
    range: acceptedRange,
    revealWindow: Object.freeze({ startEpochMs: cursor, endEpochMs: targetEpochMs }),
    targetEpochMs,
  });
}

export function readReplayCursorProposal(candidate) {
  if (!(candidate instanceof ReplayCursorProposalValue)) {
    throw new ReplayContractError(
      'REPLAY_CURSOR_PROPOSAL_REQUIRED',
      'A branded Replay cursor proposal is required.',
    );
  }
  try {
    return candidate.value();
  } catch {
    throw new ReplayContractError(
      'REPLAY_CURSOR_PROPOSAL_REQUIRED',
      'A valid branded Replay cursor proposal is required.',
    );
  }
}

/** A raw bar start is visible only below the proposed exclusive cursor cutoff. */
export function isEpochVisibleAtReplayCursor(startEpochMs, cursorEpochMs) {
  if (!Number.isSafeInteger(startEpochMs) || startEpochMs < 0) return false;
  if (!Number.isSafeInteger(cursorEpochMs) || cursorEpochMs < 0) return false;
  return startEpochMs < cursorEpochMs;
}
