import {
  CHART_ENTRY_CONTEXT_EVENTS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneContext(context) {
  return context ? {
    anchor: context.anchor,
    loadedWindow: context.loadedWindow ? { ...context.loadedWindow } : null,
    plannedWindow: context.plannedWindow ? { ...context.plannedWindow } : null,
    record: context.record ? { ...context.record } : null,
    sessionId: context.sessionId,
  } : null;
}

function cloneReplayState(replayState) {
  return replayState ? { ...replayState } : null;
}

function cloneLoaded(loaded) {
  return loaded ? {
    context: cloneContext(loaded.context),
    replayState: cloneReplayState(loaded.replayState),
    sessionId: loaded.sessionId,
  } : null;
}

export function createChartEntryReplayBootstrapRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let state = {
    error: null,
    loaded: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      loaded: cloneLoaded(state.loaded),
      status: state.status,
    };
  }

  async function bootstrapReplay(context, emitEvent) {
    try {
      const sessionId = context?.sessionId;
      if (!sessionId) {
        throw new Error('Chart entry replay bootstrap requires a session id.');
      }
      const session = await dispatchCommand(SESSION_COMMANDS.GET_BY_ID, sessionId);
      if (!session) {
        throw new Error(`Chart entry replay bootstrap session ${sessionId} does not exist.`);
      }
      const replayState = await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, session);
      state = {
        error: null,
        loaded: {
          context: cloneContext(context),
          replayState: cloneReplayState(replayState),
          sessionId,
        },
        status: 'loaded',
      };
      emitEvent?.(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED, getState().loaded);
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        loaded: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_REPLAY_BOOTSTRAP_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_CONTEXT_EVENTS.LOADED, (context) => {
          void bootstrapReplay(context, emitEvent);
        })
      );
    }
  }

  function stop() {
    while (unsubscribeCallbacks.length) {
      unsubscribeCallbacks.pop()();
    }
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      error: null,
      loaded: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryReplayBootstrap',
    start,
    stop,
  };
}
