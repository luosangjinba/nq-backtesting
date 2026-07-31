import {
  createReplayCursorProposal,
  createReplayCursorRetentionProposal,
  createReplayCursorTargetProposal,
  createReplayRange,
  readReplayCursorProposal,
  readReplayStep,
  requireCursorInRange,
  requireReplayAdvanceInput,
} from '../replay-contract/public.js';
import { createReplayActivation, requireMatchingActivation } from './activation-match.js';
import { createPreparedReplayCommit } from './prepared-replay-commit.js';
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
  initialReplayStep,
}) {
  const activation = createReplayActivation({ sessionId, activationGeneration });
  const acceptedRange = createReplayRange(range);
  let cursorEpochMs = requireCursorInRange(initialCursorEpochMs, acceptedRange);
  let visibleThroughEpochMs = cursorEpochMs;
  let playback = 'paused';
  let replayStep = initialReplayStep;
  readReplayStep(replayStep);
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
    return snapshotValue();
  }

  function snapshotValue(overrides = {}) {
    return Object.freeze({
      activationGeneration: activation.activationGeneration,
      complete: cursorEpochMs === acceptedRange.endEpochMs,
      cursorEpochMs,
      playback,
      range: acceptedRange,
      replayStep,
      visibleThroughEpochMs,
      revision,
      sessionId: activation.sessionId,
      ...overrides,
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

  function proposeRetention({ identity }) {
    requireActive();
    requireMatchingActivation(identity, activation);
    const proposal = createReplayCursorRetentionProposal({
      baseRevision: revision,
      cursorEpochMs,
      identity,
      range: acceptedRange,
    });
    issuedProposals.add(proposal);
    return proposal;
  }

  function proposeTarget({ identity, targetEpochMs }) {
    requireActive();
    requireMatchingActivation(identity, activation);
    const proposal = createReplayCursorTargetProposal({
      baseRevision: revision,
      cursorEpochMs,
      identity,
      range: acceptedRange,
      targetEpochMs,
    });
    issuedProposals.add(proposal);
    return proposal;
  }

  function play() {
    requireActive();
    if (cursorEpochMs === acceptedRange.endEpochMs) {
      throw new ReplayRuntimeError('REPLAY_COMPLETE', 'Replay is already at Session end.');
    }
    playback = 'playing';
    return snapshot();
  }

  function pause() {
    requireActive();
    playback = 'paused';
    return snapshot();
  }

  function setReplayStep(candidate) {
    requireActive();
    readReplayStep(candidate);
    replayStep = candidate;
    return snapshot();
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

  function requireVisibility(visibility, targetEpochMs) {
    if (visibility === undefined) return targetEpochMs;
    if (!visibility || Object.keys(visibility).join(',') !== 'visibleThroughEpochMs') {
      throw new ReplayRuntimeError('REPLAY_VISIBILITY_INVALID', 'Visible completion metadata is invalid.');
    }
    const candidate = visibility.visibleThroughEpochMs;
    if (candidate !== null && (!Number.isSafeInteger(candidate)
      || candidate < acceptedRange.startEpochMs || candidate >= targetEpochMs)) {
      throw new ReplayRuntimeError('REPLAY_VISIBILITY_INVALID', 'visibleThroughEpochMs must precede the cursor.');
    }
    return candidate;
  }

  function commitVisible(proposal, visibility = undefined) {
    const prepared = prepareVisible(proposal, visibility);
    const receipt = prepared.apply();
    prepared.finalize(receipt);
    return snapshot();
  }

  function prepareVisible(proposal, visibility = undefined, nextReplayStep = replayStep) {
    const value = requireCommittable(proposal);
    const acceptedVisibility = requireVisibility(visibility, value.targetEpochMs);
    readReplayStep(nextReplayStep);
    if (revision === Number.MAX_SAFE_INTEGER) {
      throw new ReplayRuntimeError('REPLAY_REVISION_EXHAUSTED', 'Replay revision is exhausted.');
    }
    const baseRevision = revision;
    const previous = Object.freeze({
      cursorEpochMs,
      playback,
      replayStep,
      revision,
      visibleThroughEpochMs,
    });
    const candidate = snapshotValue({
      complete: value.targetEpochMs === acceptedRange.endEpochMs,
      cursorEpochMs: value.targetEpochMs,
      playback: value.targetEpochMs === acceptedRange.endEpochMs ? 'paused' : playback,
      replayStep: nextReplayStep,
      revision: baseRevision + 1,
      visibleThroughEpochMs: acceptedVisibility,
    });
    let applied = false;
    let released = false;

    function release() {
      if (released) return;
      released = true;
      issuedProposals.delete(proposal);
    }

    return createPreparedReplayCommit({
      baseRevision,
      candidate,
      hooks: Object.freeze({
        apply() {
          requireCommittable(proposal);
          cursorEpochMs = candidate.cursorEpochMs;
          playback = candidate.playback;
          replayStep = candidate.replayStep;
          revision = candidate.revision;
          visibleThroughEpochMs = candidate.visibleThroughEpochMs;
          applied = true;
        },
        finalize() {
          if (!applied || revision !== candidate.revision
            || cursorEpochMs !== candidate.cursorEpochMs) {
            throw new ReplayRuntimeError(
              'REPLAY_PREPARED_COMMIT_STALE',
              'Prepared Replay candidate is no longer the reversible applied state.',
            );
          }
          release();
        },
        release,
        rollback() {
          if (applied) {
            cursorEpochMs = previous.cursorEpochMs;
            playback = previous.playback;
            replayStep = previous.replayStep;
            revision = previous.revision;
            visibleThroughEpochMs = previous.visibleThroughEpochMs;
            applied = false;
          }
          release();
        },
      }),
      identity: value.identity,
    });
  }

  function reject(proposal) {
    requireActive();
    readReplayCursorProposal(proposal);
    return issuedProposals.delete(proposal);
  }

  function dispose() {
    disposed = true;
  }

  return Object.freeze({
    commitVisible,
    dispose,
    pause,
    play,
    prepareVisible,
    proposeAdvance,
    proposeRetention,
    proposeTarget,
    reject,
    setReplayStep,
    snapshot,
  });
}
