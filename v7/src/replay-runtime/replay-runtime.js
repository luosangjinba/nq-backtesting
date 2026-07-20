import {
  createReplayCursorProposal,
  createReplayRange,
  readReplayCursorProposal,
  requireCursorInRange,
  requireReplayAdvanceInput,
} from '../replay-contract/public.js';
import { createReplayActivation, requireMatchingActivation } from './activation-match.js';
import { ReplayRuntimeError } from './runtime-error.js';

function rangesEqual(left, right) {
  return left.startEpochMs === right.startEpochMs && left.endEpochMs === right.endEpochMs;
}

/**
 * Creates the sole accepted Replay clock for one Session activation.
 * Proposals are inert until the coordinator confirms visible completion.
 */
export function createReplayRuntime({
  sessionId,
  activationGeneration,
  range,
  initialCursorEpochMs,
}) {
  const activation = createReplayActivation({ sessionId, activationGeneration });
  const acceptedRange = createReplayRange(range);
  let cursorEpochMs = requireCursorInRange(initialCursorEpochMs, acceptedRange);
  let revision = 0;
  let disposed = false;
  const issuedProposals = new WeakSet();

  function requireActive() {
    if (disposed) {
      throw new ReplayRuntimeError('REPLAY_RUNTIME_DISPOSED', 'Replay Runtime is disposed.');
    }
  }

  function snapshot() {
    requireActive();
    return Object.freeze({
      activationGeneration: activation.activationGeneration,
      complete: cursorEpochMs === acceptedRange.endEpochMs,
      cursorEpochMs,
      playback: 'paused',
      range: acceptedRange,
      revealedThroughEpochMs: cursorEpochMs,
      revision,
      sessionId: activation.sessionId,
    });
  }

  function proposeAdvance({ identity, advance }) {
    requireActive();
    requireMatchingActivation(identity, activation);
    requireReplayAdvanceInput(advance);
    if (cursorEpochMs === acceptedRange.endEpochMs) {
      throw new ReplayRuntimeError('REPLAY_COMPLETE', 'Replay is already at Session end.');
    }
    const proposal = createReplayCursorProposal({
      advance,
      baseRevision: revision,
      cursorEpochMs,
      identity,
      range: acceptedRange,
    });
    issuedProposals.add(proposal);
    return proposal;
  }

  function requireCommittable(proposal) {
    requireActive();
    const value = readReplayCursorProposal(proposal);
    if (!issuedProposals.has(proposal)) {
      throw new ReplayRuntimeError(
        'REPLAY_PROPOSAL_FOREIGN',
        'Replay proposal was not issued by this clock.',
      );
    }
    requireMatchingActivation(value.identity, activation);
    if (!rangesEqual(value.range, acceptedRange)) {
      throw new ReplayRuntimeError('REPLAY_RANGE_MISMATCH', 'Replay proposal range changed.');
    }
    if (value.baseRevision !== revision || value.cursorEpochMs !== cursorEpochMs) {
      throw new ReplayRuntimeError('REPLAY_PROPOSAL_STALE', 'Replay proposal is stale.');
    }
    return value;
  }

  function commitVisible(proposal) {
    const value = requireCommittable(proposal);
    if (revision === Number.MAX_SAFE_INTEGER) {
      throw new ReplayRuntimeError('REPLAY_REVISION_EXHAUSTED', 'Replay revision is exhausted.');
    }
    issuedProposals.delete(proposal);
    cursorEpochMs = value.targetEpochMs;
    revision += 1;
    return snapshot();
  }

  function reject(proposal) {
    requireActive();
    readReplayCursorProposal(proposal);
    return issuedProposals.delete(proposal);
  }

  function dispose() {
    disposed = true;
  }

  return Object.freeze({ commitVisible, dispose, proposeAdvance, reject, snapshot });
}
