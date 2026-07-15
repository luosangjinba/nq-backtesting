import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_RESTART_COMMANDS,
  CHART_ENTRY_RESTART_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { replaceReplayCursorAcrossPanes } from '../replay/replay-cursor-pane-replacer.js';
import {
  dispatchCommand as dispatchRuntimeCommand,
  hasCommand as hasRuntimeCommand,
  registerCommand,
} from '../runtime/commands.js';
import { normalizeMinuteTimeframe } from '../time-domain/time-domain.js';

function cloneRestarted(restarted) {
  return restarted ? {
    chartRecords: restarted.chartRecords?.map((record) => ({ ...record })) || [],
    cutoffTime: restarted.cutoffTime,
    paneIds: [...(restarted.paneIds || [])],
    replayState: restarted.replayState ? { ...restarted.replayState } : null,
    restartedAt: restarted.restartedAt,
    sessionId: restarted.sessionId,
  } : null;
}

function normalizePaneIds(paneIds = []) {
  return [...new Set((Array.isArray(paneIds) ? paneIds : [])
    .map((paneId) => String(paneId || '').trim())
    .filter(Boolean))];
}

export function createChartEntryRestartRuntime({
  dispatchCommand = dispatchRuntimeCommand,
  hasCommand = hasRuntimeCommand,
  replaceCursor = replaceReplayCursorAcrossPanes,
} = {}) {
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

  async function resolvePaneIds(payload = {}) {
    const requested = normalizePaneIds(payload.paneIds);
    if (requested.length) return requested;
    const panes = await dispatchCommand(PANE_COMMANDS.LIST);
    const paneIds = normalizePaneIds((panes || []).map((pane) => pane?.id));
    if (!paneIds.length) throw new Error('Bar Replay restart requires at least one pane.');
    return paneIds;
  }

  async function restart(payload = {}, emitEvent) {
    try {
      const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      if (!replayState?.sessionId) throw new Error('Bar Replay restart requires an active replay session.');
      const cutoffMs = new Date(payload.cutoffTime).getTime();
      const startMs = new Date(replayState.startTime).getTime();
      const cursorMs = new Date(replayState.cursorTime).getTime();
      if (!Number.isFinite(cutoffMs)) throw new Error('Bar Replay restart requires a valid chart time.');
      if (cutoffMs <= startMs) throw new Error('You cannot go further back than the session start date.');
      if (cutoffMs > cursorMs) throw new Error('Bar Replay restart cannot select unrevealed future time.');
      const sourceMinutes = normalizeMinuteTimeframe(replayState.timeframe, {
        fieldName: 'Bar Replay restart source timeframe',
      });
      const targetTime = new Date(cutoffMs - (sourceMinutes * 60 * 1000)).toISOString();
      const paneIds = await resolvePaneIds(payload);
      if (hasCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP)) {
        await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
      } else {
        await dispatchCommand(REPLAY_COMMANDS.PAUSE);
      }
      const rewoundReplayState = await dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: targetTime,
      });
      const replaced = await replaceCursor({
        dispatchCommand,
        hasCommand,
        paneIds,
        replayState: rewoundReplayState,
      });
      state = {
        error: null,
        restarted: {
          chartRecords: replaced.chartRecords,
          cutoffTime: new Date(cutoffMs).toISOString(),
          paneIds,
          replayState: rewoundReplayState,
          restartedAt: new Date().toISOString(),
          sessionId: replayState.sessionId,
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
      registerCommand(CHART_ENTRY_RESTART_COMMANDS.RESTART, (payload) => restart(payload, emitEvent)),
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
