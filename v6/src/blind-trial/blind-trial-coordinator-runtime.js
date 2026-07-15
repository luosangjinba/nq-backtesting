import {
  BLIND_TRIAL_COMMANDS,
  BLIND_TRIAL_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { createBlindTrialReplayProvenance } from '../validation-domain/blind-trial-provenance.js';
import {
  dispatchCommand as dispatchRuntimeCommand,
  registerCommand,
} from '../runtime/commands.js';

function clone(value) {
  return value === null || value === undefined
    ? value
    : JSON.parse(JSON.stringify(value));
}

function trialIdFrom(payload = {}) {
  const trialId = String(payload.trialId || '').trim();
  if (!trialId) throw new Error('Blind trial trialId must be a non-empty string.');
  return trialId;
}

function replayProvenance(replayState) {
  if (!replayState?.sessionId) {
    throw new Error('Blind trial requires a loaded Replay session.');
  }
  if (replayState.status === 'ended') {
    throw new Error('Blind trial cannot start or resume after Replay has ended.');
  }
  return createBlindTrialReplayProvenance({
    cursorIndex: replayState.cursorIndex,
    cursorTime: replayState.cursorTime,
    revealedCount: replayState.revealedCount,
    sessionId: replayState.sessionId,
    visibleThroughTime: replayState.cursorTime,
  });
}

export function createBlindTrialCoordinatorRuntime({
  dispatchCommand = dispatchRuntimeCommand,
  now = () => Date.now(),
  repository,
} = {}) {
  if (!repository) throw new Error('Blind trial coordinator requires a validation repository.');
  const unregisterCallbacks = [];
  let inFlight = false;
  let state = {
    activeTrialId: null,
    error: null,
    lastResult: null,
    status: 'idle',
  };

  function getState() {
    return {
      activeTrialId: state.activeTrialId,
      error: state.error,
      inFlight,
      lastResult: clone(state.lastResult),
      status: state.status,
    };
  }

  function reject(action, trialId, error, emitEvent) {
    const result = {
      action,
      reason: error?.message || String(error),
      status: 'rejected',
      trialId: trialId || null,
    };
    state = {
      activeTrialId: state.activeTrialId,
      error: result.reason,
      lastResult: result,
      status: 'rejected',
    };
    emitEvent?.(BLIND_TRIAL_EVENTS.REJECTED, clone(result));
    return getState();
  }

  async function coordinate(action, payload, emitEvent) {
    let trialId = null;
    if (inFlight) {
      return reject(action, payload?.trialId, new Error('Blind trial request is already in flight.'), emitEvent);
    }
    inFlight = true;
    try {
      trialId = trialIdFrom(payload);
      const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      const provenance = replayProvenance(replayState);
      let trial;
      if (action === 'start') {
        trial = await repository.startTrial(trialId, provenance, {
          startedAt: payload?.startedAt ?? now(),
        });
      } else {
        trial = await repository.getTrial(trialId);
        if (!trial) throw new Error(`Validation trial not found: ${trialId}`);
        if (trial.status !== 'active') {
          throw new Error(`Blind trial must be active before resume; received ${trial.status}.`);
        }
        if (trial.replaySessionId !== provenance.sessionId) {
          throw new Error('Loaded Replay session does not match the blind trial session.');
        }
      }
      const result = {
        action,
        currentReplay: provenance,
        startVisibleThroughTime: trial.replayVisibleThroughTime,
        status: action === 'start' ? 'started' : 'resumed',
        trial,
        trialId,
      };
      state = {
        activeTrialId: trialId,
        error: null,
        lastResult: result,
        status: result.status,
      };
      emitEvent?.(
        action === 'start' ? BLIND_TRIAL_EVENTS.STARTED : BLIND_TRIAL_EVENTS.RESUMED,
        clone(result),
      );
      return getState();
    } catch (error) {
      return reject(action, trialId, error, emitEvent);
    } finally {
      inFlight = false;
    }
  }

  async function start({ emitEvent } = {}) {
    await repository.open?.();
    unregisterCallbacks.push(
      registerCommand(BLIND_TRIAL_COMMANDS.GET_STATE, () => getState()),
      registerCommand(BLIND_TRIAL_COMMANDS.START, (payload) => coordinate('start', payload, emitEvent)),
      registerCommand(BLIND_TRIAL_COMMANDS.RESUME, (payload) => coordinate('resume', payload, emitEvent)),
    );
  }

  async function stop() {
    while (unregisterCallbacks.length) unregisterCallbacks.pop()();
    await repository.close?.();
    inFlight = false;
    state = {
      activeTrialId: null,
      error: null,
      lastResult: null,
      status: 'idle',
    };
  }

  return Object.freeze({
    id: 'runtime.blind-trial-coordinator',
    start,
    stop,
  });
}
