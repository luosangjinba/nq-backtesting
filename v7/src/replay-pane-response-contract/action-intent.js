import { failReplayPaneResponse } from './response-error.js';

export const REPLAY_PANE_ACTION_KINDS = Object.freeze([
  'manual-next',
  'manual-previous',
  'autoplay-next',
  'restart-back-to',
  'goto-anchor',
  'goto-exact',
]);

export const REPLAY_GOTO_ANCHORS = Object.freeze([
  'next-day-open',
  'next-session',
  'asian-session',
  'london-session',
  'new-york-session',
  'silver-bullet-london',
  'silver-bullet-new-york-am',
  'silver-bullet-new-york-pm',
]);

class ReplayPaneActionValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function exactFields(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failReplayPaneResponse(
      'REPLAY_PANE_ACTION_FIELDS_INVALID',
      'Replay Pane action must contain exactly the fields required by its kind.',
    );
  }
}

function targetEpochMs(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    failReplayPaneResponse(
      'REPLAY_PANE_ACTION_TARGET_INVALID',
      'Replay target must be a non-negative safe epoch.',
    );
  }
  return value;
}

/**
 * Owner: Replay Runtime contract boundary.
 * Purpose: describe one transport/navigation intent without mutating Replay.
 * Inputs: exact action-specific fields; quick GoTo uses a registered anchor,
 * while Restart/Back-to and exact GoTo use an explicit epoch target.
 * Outputs: branded immutable action value.
 * Side effects/lifecycle/concurrency: none.
 * Errors: stable ReplayPaneResponseContractError.
 */
export function createReplayPaneAction(value) {
  const kind = value?.kind;
  if (!REPLAY_PANE_ACTION_KINDS.includes(kind)) {
    failReplayPaneResponse('REPLAY_PANE_ACTION_KIND_INVALID', 'Replay Pane action kind is unsupported.');
  }
  if (kind === 'goto-anchor') {
    exactFields(value, ['anchor', 'kind']);
    if (!REPLAY_GOTO_ANCHORS.includes(value.anchor)) {
      failReplayPaneResponse('REPLAY_PANE_ACTION_ANCHOR_INVALID', 'Quick GoTo anchor is unsupported.');
    }
    return new ReplayPaneActionValue({ anchor: value.anchor, kind, targetEpochMs: null });
  }
  if (kind === 'restart-back-to' || kind === 'goto-exact') {
    exactFields(value, ['kind', 'targetEpochMs']);
    return new ReplayPaneActionValue({ anchor: null, kind, targetEpochMs: targetEpochMs(value.targetEpochMs) });
  }
  exactFields(value, ['kind']);
  return new ReplayPaneActionValue({ anchor: null, kind, targetEpochMs: null });
}

/**
 * Owner: Replay Runtime contract boundary.
 * Purpose: read a validated action while rejecting structural lookalikes.
 * Inputs/outputs: branded action; returns its frozen semantic value.
 * Side effects/lifecycle: none.
 * Errors: REPLAY_PANE_ACTION_REQUIRED.
 */
export function readReplayPaneAction(candidate) {
  if (!(candidate instanceof ReplayPaneActionValue)) {
    failReplayPaneResponse('REPLAY_PANE_ACTION_REQUIRED', 'A branded Replay Pane action is required.');
  }
  return candidate.read();
}
