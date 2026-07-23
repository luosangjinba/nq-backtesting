import { requireProjectedPaneSetSnapshot } from '../chart-snapshot-application/public.js';
import { readPaneSetTransactionInput } from '../pane-set-materialization/public.js';
import { readReplayCursorProposal } from '../replay-contract/public.js';
import { requireReplayPaneResponsePlan } from '../replay-pane-response-contract/public.js';
import { failReplayNavigation } from './navigation-error.js';

function requireMethod(port, name, owner) {
  if (!port || typeof port[name] !== 'function') {
    failReplayNavigation('REPLAY_NAVIGATION_PORT_INVALID', `${owner} requires ${name}().`);
  }
  return port[name].bind(port);
}

function rangesEqual(left, right) {
  return left.startEpochMs === right.startEpochMs && left.endEpochMs === right.endEpochMs;
}

function requireSignal(signal) {
  if (!signal || typeof signal.aborted !== 'boolean') {
    failReplayNavigation('REPLAY_NAVIGATION_SIGNAL_REQUIRED', 'Replay proposal requires an AbortSignal.');
  }
  if (signal.aborted) {
    failReplayNavigation('REPLAY_NAVIGATION_STALE', 'Replay proposal is stale.');
  }
  return signal;
}

function direction(cursorEpochMs, targetEpochMs) {
  return targetEpochMs > cursorEpochMs ? 'forward' : targetEpochMs < cursorEpochMs ? 'backward' : 'retain';
}

function primaryVisibleThrough(snapshot, plan, resolvedSourceEpochMs) {
  let visibleThroughEpochMs = null;
  const targetEpochMs = readReplayCursorProposal(snapshot.cursorProposal).targetEpochMs;
  for (let index = 0; index < snapshot.panes.length; index += 1) {
    const pane = snapshot.panes[index];
    const response = plan.paneResponses[index];
    if (pane.status !== 'ready' || response.instrumentId !== plan.cursorAuthorityInstrumentId) continue;
    const candidate = pane.snapshot.provenance.visibleThroughEpochMs;
    if (candidate !== null && candidate >= plan.replayRange.startEpochMs && candidate < targetEpochMs
      && (visibleThroughEpochMs === null || candidate > visibleThroughEpochMs)) {
      visibleThroughEpochMs = candidate;
    }
  }
  return visibleThroughEpochMs ?? resolvedSourceEpochMs;
}

/**
 * Owner: Workspace Transaction Runtime Replay port boundary.
 * Purpose: adapt one R6.2 response plan into a Replay-owned exact target
 * proposal and derive primary-source visibility after complete Pane-set paint.
 * Inputs: the sole Replay Runtime and injected target resolver.
 * Outputs: frozen propose/commitVisible/reject port for Workspace Transaction Runtime.
 * Side effects: target lookup delegation and Replay public API calls only.
 * Errors: stable navigation failures or delegated owner failures.
 * Concurrency/cancellation: target lookup receives the transaction AbortSignal;
 * stale work cannot issue or commit a current proposal.
 */
export function createReplayNavigationReplayPort({ replayRuntime, targetResolver }) {
  const replaySnapshot = requireMethod(replayRuntime, 'snapshot', 'Replay Runtime');
  const proposeTarget = requireMethod(replayRuntime, 'proposeTarget', 'Replay Runtime');
  const commitTarget = requireMethod(replayRuntime, 'commitVisible', 'Replay Runtime');
  const rejectTarget = requireMethod(replayRuntime, 'reject', 'Replay Runtime');
  const resolveTarget = requireMethod(targetResolver, 'resolve', 'Target resolver');
  const resolvedSourceByProposal = new WeakMap();

  return Object.freeze({
    async propose({ identity, input, operation, signal }) {
      requireSignal(signal);
      const plan = requireReplayPaneResponsePlan(readPaneSetTransactionInput(input).responsePlan);
      if (operation !== plan.actionKind) {
        failReplayNavigation('REPLAY_NAVIGATION_OPERATION_MISMATCH', 'Transaction operation must match its Replay action.');
      }
      const replay = replaySnapshot();
      if (replay.cursorEpochMs !== plan.fromCursorEpochMs || !rangesEqual(replay.range, plan.replayRange)) {
        failReplayNavigation('REPLAY_NAVIGATION_CURSOR_STALE', 'Response plan does not match the accepted Replay cursor.');
      }
      if (replay.replayStep !== plan.replayStep) {
        failReplayNavigation('REPLAY_NAVIGATION_STEP_STALE', 'Response plan does not match the accepted Replay step.');
      }
      const hasCursorAuthorityPane = plan.paneResponses.some(
        ({ instrumentId }) => instrumentId === plan.cursorAuthorityInstrumentId,
      );
      let resolvedSourceEpochMs = null;
      let targetEpochMs = plan.target.requestedTargetEpochMs;
      if (targetEpochMs === null || !hasCursorAuthorityPane) {
        const resolution = await resolveTarget({
          range: replay.range,
          requireSourceEvidence: !hasCursorAuthorityPane,
          responsePlan: plan,
          signal,
        });
        targetEpochMs = resolution.targetEpochMs;
        resolvedSourceEpochMs = resolution.sourceEpochMs;
      }
      requireSignal(signal);
      if (direction(replay.cursorEpochMs, targetEpochMs) !== plan.target.direction) {
        failReplayNavigation('REPLAY_NAVIGATION_TARGET_DIRECTION', 'Replay target direction does not match its plan.');
      }
      const proposal = proposeTarget({ identity, targetEpochMs });
      resolvedSourceByProposal.set(proposal, resolvedSourceEpochMs);
      return proposal;
    },
    commitVisible(proposal, workspaceSnapshot) {
      const proposalValue = readReplayCursorProposal(proposal);
      const snapshot = requireProjectedPaneSetSnapshot(workspaceSnapshot, proposalValue.identity);
      const plan = requireReplayPaneResponsePlan(snapshot.responsePlan);
      const resolvedSourceEpochMs = resolvedSourceByProposal.get(proposal) ?? null;
      resolvedSourceByProposal.delete(proposal);
      return commitTarget(proposal, {
        visibleThroughEpochMs: primaryVisibleThrough(snapshot, plan, resolvedSourceEpochMs),
      });
    },
    reject(proposal) {
      resolvedSourceByProposal.delete(proposal);
      return rejectTarget(proposal);
    },
  });
}
