import {
  CHART_ENTRY_RESTART_COMMANDS,
  CHART_ENTRY_RESTART_EVENTS,
  SESSION_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneRestarted(restarted) {
  return restarted ? {
    restartedAt: restarted.restartedAt,
    session: restarted.session ? { ...restarted.session } : null,
    sessionId: restarted.sessionId,
  } : null;
}

export function createChartEntryRestartRuntime() {
  const unregisterCallbacks = [];
  let state = {
    error: null,
    restarted: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      restarted: cloneRestarted(state.restarted),
      status: state.status,
    };
  }

  async function restart(emitEvent) {
    try {
      const activeSession = await dispatchCommand(SESSION_COMMANDS.GET_ACTIVE);
      if (!activeSession?.id) {
        throw new Error('Chart entry restart requires an active session.');
      }
      const reopened = await dispatchCommand(SESSION_COMMANDS.OPEN, activeSession.id);
      state = {
        error: null,
        restarted: {
          restartedAt: new Date().toISOString(),
          session: { ...reopened },
          sessionId: reopened.id,
        },
        status: 'restarted',
      };
      emitEvent?.(CHART_ENTRY_RESTART_EVENTS.RESTARTED, getState().restarted);
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        restarted: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_RESTART_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, () => restart(emitEvent)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    state = {
      error: null,
      restarted: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryRestart',
    start,
    stop,
  };
}
