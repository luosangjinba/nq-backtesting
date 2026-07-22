import { describeWorkspaceTransactionEnvelope } from '../workspace-transaction-contract/public.js';
import { failReplayNavigation } from './navigation-error.js';

const RESULTS = new WeakSet();

export const GOTO_TARGET_UNAVAILABLE_IN_RANGE = 'goto-target-unavailable-in-range';

export function createReplayNavigationResult({ actionKind, code = null, status, terminal = null }) {
  if (typeof actionKind !== 'string' || !['cancelled', 'committed', 'failed', 'noop', 'rejected', 'stale'].includes(status)) {
    failReplayNavigation('REPLAY_NAVIGATION_RESULT_INVALID', 'Navigation result is invalid.');
  }
  if (terminal !== null) {
    const value = describeWorkspaceTransactionEnvelope(terminal);
    if (value.phase !== 'terminal' || value.status !== status || value.operation !== actionKind || value.code !== code) {
      failReplayNavigation('REPLAY_NAVIGATION_TERMINAL_MISMATCH', 'Navigation result terminal does not match.');
    }
  } else if ((status !== 'noop' && status !== 'rejected') || typeof code !== 'string') {
    failReplayNavigation('REPLAY_NAVIGATION_RESULT_INVALID', 'Terminal-free result must be noop or rejected.');
  }
  const result = Object.freeze({ actionKind, code, status, terminal });
  RESULTS.add(result);
  return result;
}

/**
 * Owner: Replay navigation runtime boundary.
 * Purpose: reject structural lookalikes at navigation result consumers.
 * Inputs/outputs: unknown candidate; returns the branded immutable outcome.
 * Side effects/lifecycle: none.
 * Errors: REPLAY_NAVIGATION_RESULT_REQUIRED.
 */
export function readReplayNavigationResult(candidate) {
  if (!candidate || !RESULTS.has(candidate)) {
    failReplayNavigation('REPLAY_NAVIGATION_RESULT_REQUIRED', 'A branded navigation result is required.');
  }
  return candidate;
}
