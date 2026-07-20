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

function requireBase({ identity, range, baseRevision, cursorEpochMs }) {
  const acceptedRange = createReplayRange(range);
  const cursor = requireCursorInRange(cursorEpochMs, acceptedRange);
  requireWorkspaceTransactionIdentity(identity);
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) {
    throw new ReplayContractError(
      'REPLAY_BASE_REVISION_INVALID',
      'Replay proposal base revision must be a non-negative safe integer.',
    );
  }
  return Object.freeze({ acceptedRange, cursor });
}

export function createReplayCursorProposal({
  identity,
  range,
  baseRevision,
  cursorEpochMs,
  advance,
}) {
  const { acceptedRange, cursor } = requireBase({ identity, range, baseRevision, cursorEpochMs });
  requireReplayAdvanceInput(advance);
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
    kind: 'advance',
    range: acceptedRange,
    revealWindow: Object.freeze({ startEpochMs: cursor, endEpochMs: targetEpochMs }),
    targetEpochMs,
  });
}

/** Create an inert proposal that republishes visibility without moving the source cursor. */
export function createReplayCursorRetentionProposal({
  identity,
  range,
  baseRevision,
  cursorEpochMs,
}) {
  const { acceptedRange, cursor } = requireBase({ identity, range, baseRevision, cursorEpochMs });
  return new ReplayCursorProposalValue({
    advance: null,
    baseRevision,
    complete: cursor === acceptedRange.endEpochMs,
    cursorEpochMs: cursor,
    identity,
    kind: 'retain',
    range: acceptedRange,
    revealWindow: Object.freeze({ startEpochMs: cursor, endEpochMs: cursor }),
    targetEpochMs: cursor,
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
