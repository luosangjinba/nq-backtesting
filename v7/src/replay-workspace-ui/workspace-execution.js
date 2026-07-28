import { createPaneSetTransactionInput } from '../pane-set-materialization/public.js';
import {
  GOTO_TARGET_UNAVAILABLE_IN_RANGE,
  readReplayNavigationResult,
} from '../replay-navigation-runtime/public.js';
import { createReplayPaneAction, planReplayPaneResponse } from '../replay-pane-response-contract/public.js';
import { createTransactionId } from '../transaction-identity/public.js';
import {
  createWorkspaceTransactionIdentity,
  createWorkspaceTransactionIntent,
  describeWorkspaceTransactionEnvelope,
} from '../workspace-transaction-contract/public.js';
import { planSingleHistoryFill } from './history-fill-plan.js';
import { createRefreshFeedback } from './refresh-feedback.js';

/** Own transient UI dispatch/pending policy around the sole Workspace Transaction coordinator. */
export function createWorkspaceExecution({
  acceptVisibleState,
  historyPort,
  initialSessionHoursMode,
  market,
  navigation,
  paneData,
  paneState,
  range,
  record,
  replay,
  runtime,
  view,
}) {
  if (typeof historyPort?.readPaneHistoryState !== 'function') {
    throw new TypeError('Workspace execution requires a read-only Pane history state port.');
  }
  const refreshFeedback = createRefreshFeedback({ view });
  let disposed = false;
  let pending = false;
  let sessionHoursMode = initialSessionHoursMode ?? market.defaultTarget.sessionHoursMode;
  let sessionHoursRevision = 0;
  let transactionSequence = 0;

  function identity(operation) {
    return createWorkspaceTransactionIntent({
      identity: createWorkspaceTransactionIdentity({
        activationGeneration: record.activationGeneration,
        sessionId: record.sessionId,
        transactionId: createTransactionId(`workspace-${++transactionSequence}`),
      }),
      operation,
    });
  }

  function sessionHours(mode = sessionHoursMode, revision = sessionHoursRevision) {
    return Object.freeze({ calendarRevision: market.calendar.revision, mode, revision });
  }

  async function run(task, { allowDim = false, loading = false } = {}) {
    if (disposed || pending) return null;
    pending = true;
    if (loading) view.setState('loading');
    const feedbackToken = loading ? null : refreshFeedback.begin({ allowDim });
    try {
      return await task();
    } catch (error) {
      paneData.reject();
      if (!disposed) view.setState(loading ? 'unavailable' : 'error', { message: error?.message });
      return null;
    } finally {
      pending = false;
      refreshFeedback.finish(feedbackToken);
    }
  }

  async function action(kind, options = {}, runOptions = {}) {
    return run(async () => {
      const replayAction = createReplayPaneAction({ kind, ...options });
      const result = readReplayNavigationResult(await navigation.execute({
        action: replayAction,
        intent: identity(kind),
        paneWorkspace: paneState.current(),
        replayRange: range,
        sessionHours: sessionHours(),
      }));
      if (result.status === 'committed') {
        paneData.accept(paneState.paneIds());
        acceptVisibleState(paneState.current(), sessionHoursMode);
      } else {
        paneData.reject();
        view.setReplay(replay.snapshot());
        if (result.status === 'rejected' && result.code === GOTO_TARGET_UNAVAILABLE_IN_RANGE) {
          return result;
        }
        if (result.status !== 'noop') throw Object.assign(new Error(result.code), { code: result.code });
      }
      return result;
    }, runOptions);
  }

  async function materialize({
    desiredMode = sessionHoursMode,
    desiredRevision = sessionHoursRevision,
    desiredWorkspace = paneState.current(),
    requestKinds = new Map(),
  } = {}, runOptions = { allowDim: true }) {
    return run(async () => {
      const replayAction = createReplayPaneAction({
        kind: 'goto-exact', targetEpochMs: replay.snapshot().cursorEpochMs,
      });
      const responsePlan = planReplayPaneResponse({
        action: replayAction,
        paneWorkspace: desiredWorkspace,
        replayRange: range,
        replayStep: replay.snapshot().replayStep,
        sessionHours: sessionHours(desiredMode, desiredRevision),
      });
      const paneRequests = Object.freeze(responsePlan.paneResponses.map((paneResponse) => Object.freeze({
        paneId: paneResponse.paneId,
        request: paneData.createRequest({
          historyDisplayBars: requestKinds.get(paneResponse.paneId)?.historyDisplayBars ?? null,
          kind: requestKinds.get(paneResponse.paneId)?.kind ?? 'navigation',
          oldestEpochMs: requestKinds.get(paneResponse.paneId)?.oldestEpochMs ?? null,
          targetEpochMs: requestKinds.get(paneResponse.paneId)?.targetEpochMs ?? null,
          responsePlan,
        }),
      })));
      const terminal = describeWorkspaceTransactionEnvelope(await runtime.execute({
        input: createPaneSetTransactionInput({ paneRequests, responsePlan }),
        intent: identity('goto-exact'),
      }));
      if (terminal.status !== 'committed') throw Object.assign(new Error(terminal.code), { code: terminal.code });
      paneData.accept(paneState.paneIds(desiredWorkspace));
      sessionHoursMode = desiredMode;
      sessionHoursRevision = desiredRevision;
      acceptVisibleState(desiredWorkspace, desiredMode);
      return terminal;
    }, runOptions);
  }

  function requestHistory(paneId) {
    if (disposed) return undefined;
    if (pending) return undefined;
    const oldestEpochMs = paneData.oldestEpochMs(paneId);
    const historyState = historyPort.readPaneHistoryState(paneId);
    if (oldestEpochMs === null || oldestEpochMs <= 0 || historyState === null) return undefined;
    const fill = planSingleHistoryFill(historyState);
    return materialize({
      requestKinds: new Map([[paneId, {
        historyDisplayBars: fill.displayBars,
        kind: 'history-extension',
        oldestEpochMs,
      }]]),
    }, { allowDim: false });
  }

  function requestTimeLocationHistory(paneId, targetEpochMs) {
    if (disposed || pending) return undefined;
    const oldestEpochMs = paneData.oldestEpochMs(paneId);
    if (oldestEpochMs === null || oldestEpochMs <= 0 || targetEpochMs >= oldestEpochMs) return undefined;
    return materialize({
      requestKinds: new Map([[paneId, {
        kind: 'time-location-history',
        oldestEpochMs,
        targetEpochMs,
      }]]),
    });
  }

  return Object.freeze({
    action,
    dispose() {
      disposed = true;
      refreshFeedback.dispose();
    },
    isPending: () => pending,
    materialize,
    requestHistory,
    requestTimeLocationHistory,
    replaceSessionHours(mode) {
      if (mode === sessionHoursMode) return undefined;
      return materialize({ desiredMode: mode, desiredRevision: sessionHoursRevision + 1 });
    },
    sessionHoursMode: () => sessionHoursMode,
  });
}
