import { createPaneSetTransactionInput } from '../pane-set-materialization/public.js';
import {
  planReplayPaneResponse,
  readReplayPaneAction,
} from '../replay-pane-response-contract/public.js';
import { describeWorkspaceTransactionEnvelope } from '../workspace-transaction-contract/public.js';
import { createWorkspaceSemanticCandidate } from '../workspace-transaction-runtime/public.js';
import { failReplayNavigation } from './navigation-error.js';
import {
  createReplayNavigationResult,
  GOTO_TARGET_UNAVAILABLE_IN_RANGE,
} from './navigation-result.js';

const EXECUTION_FIELDS = Object.freeze([
  'action', 'intent', 'paneWorkspace', 'publication', 'replayRange', 'replayStep', 'sessionHours',
]);

function method(port, name, owner) {
  if (!port || typeof port[name] !== 'function') {
    failReplayNavigation('REPLAY_NAVIGATION_PORT_INVALID', `${owner} requires ${name}().`);
  }
  return port[name].bind(port);
}

function exactExecution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...EXECUTION_FIELDS].sort().join(',')) {
    failReplayNavigation('REPLAY_NAVIGATION_EXECUTION_INVALID', 'Navigation execution fields are invalid.');
  }
  return value;
}

function rangesEqual(left, right) {
  return left.startEpochMs === right.startEpochMs && left.endEpochMs === right.endEpochMs;
}

function paneRequests(plan, createRequest) {
  return Object.freeze(plan.paneResponses.map((paneResponse) => {
    const request = createRequest(Object.freeze({ paneResponse, responsePlan: plan }));
    if (!request || typeof request !== 'object' || !Object.isFrozen(request)) {
      failReplayNavigation('REPLAY_NAVIGATION_PANE_REQUEST_INVALID', 'Pane request port must return a frozen object.');
    }
    return Object.freeze({ paneId: paneResponse.paneId, request });
  }));
}

/**
 * Owner: Workspace Transaction Runtime routing boundary.
 * Purpose: turn one Replay action into one complete Pane-set transaction while
 * preserving the existing coordinator as the sole materialization owner.
 * Inputs: Replay/transaction/request-owner ports and one complete action execution.
 * Outputs: branded committed/failed/stale/cancelled/noop/rejected result.
 * Side effects: changes playback only through Replay Runtime and invokes at
 * most one Workspace Transaction; it owns no cursor, bars, panes, or chart.
 * Errors: stable validation/port errors or delegated owner failures.
 * Concurrency/cancellation: one execution may be in flight; overlaps are
 * rejected without backlog and transaction cancellation remains WTR-owned.
 */
export function createReplayNavigationExecutor({ paneRequestPort, replayRuntime, transactionRuntime }) {
  const createRequest = method(paneRequestPort, 'createRequest', 'Pane request port');
  const replaySnapshot = method(replayRuntime, 'snapshot', 'Replay Runtime');
  const play = method(replayRuntime, 'play', 'Replay Runtime');
  const pause = method(replayRuntime, 'pause', 'Replay Runtime');
  const executeTransaction = method(transactionRuntime, 'execute', 'Workspace Transaction Runtime');
  let inFlight = false;

  async function execute(value) {
    const execution = exactExecution(value);
    const action = readReplayPaneAction(execution.action);
    const intent = describeWorkspaceTransactionEnvelope(execution.intent);
    if (intent.phase !== 'intent' || intent.operation !== action.kind) {
      failReplayNavigation('REPLAY_NAVIGATION_OPERATION_MISMATCH', 'Intent operation must match its Replay action.');
    }
    if (inFlight) {
      return createReplayNavigationResult({
        actionKind: action.kind, code: 'navigation-in-flight', status: 'rejected', terminal: null,
      });
    }
    inFlight = true;
    try {
      const replay = replaySnapshot();
      const plan = planReplayPaneResponse({
        action: execution.action,
        paneWorkspace: execution.paneWorkspace,
        replayRange: execution.replayRange,
        replayStep: replay.replayStep,
        sessionHours: execution.sessionHours,
      });
      if (replay.cursorEpochMs !== plan.fromCursorEpochMs || !rangesEqual(replay.range, plan.replayRange)) {
        failReplayNavigation('REPLAY_NAVIGATION_CURSOR_STALE', 'Pane Workspace cursor or Replay range is stale.');
      }
      if (action.kind === 'autoplay-next') {
        if (replay.complete) {
          return createReplayNavigationResult({
            actionKind: action.kind, code: 'replay-complete', status: 'rejected', terminal: null,
          });
        }
        play();
      } else {
        pause();
      }
      if (plan.target.direction === 'retain') {
        return createReplayNavigationResult({
          actionKind: action.kind, code: 'already-at-target', status: 'noop', terminal: null,
        });
      }
      const input = createPaneSetTransactionInput({
        paneRequests: paneRequests(plan, createRequest),
        responsePlan: plan,
      });
      const terminal = await executeTransaction({
        input,
        intent: execution.intent,
        semanticCandidate: createWorkspaceSemanticCandidate({
          paneWorkspace: execution.paneWorkspace,
          publication: execution.publication,
          replayStep: execution.replayStep,
          sessionHours: execution.sessionHours,
        }),
      });
      const terminalValue = describeWorkspaceTransactionEnvelope(terminal);
      if (terminalValue.status !== 'committed') pause();
      if (action.kind === 'goto-anchor' && terminalValue.status === 'failed'
        && terminalValue.code === GOTO_TARGET_UNAVAILABLE_IN_RANGE) {
        return createReplayNavigationResult({
          actionKind: action.kind,
          code: GOTO_TARGET_UNAVAILABLE_IN_RANGE,
          status: 'rejected',
          terminal: null,
        });
      }
      return createReplayNavigationResult({
        actionKind: action.kind,
        code: terminalValue.code,
        status: terminalValue.status,
        terminal,
      });
    } catch (error) {
      pause();
      throw error;
    } finally {
      inFlight = false;
    }
  }

  return Object.freeze({ execute });
}
