import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  REPLAY_NAVIGATION_COMMANDS,
  REPLAY_NAVIGATION_EVENTS,
  REPLAY_NAVIGATION_PREFERENCES_COMMANDS,
} from '../contracts/app-contracts.js';
import { appendReplayCursorAcrossPanes } from '../replay/replay-cursor-pane-materializer.js';
import {
  dispatchCommand as dispatchRuntimeCommand,
  hasCommand as hasRuntimeCommand,
  registerCommand,
} from '../runtime/commands.js';
import { resolveReplayNavigationTarget } from './replay-navigation-target-resolver.js';

function cloneRecord(record) {
  if (!record) return null;
  return {
    ...record,
    candidate: record.candidate ? { ...record.candidate } : null,
    chartRecords: Array.isArray(record.chartRecords)
      ? record.chartRecords.map((item) => ({ ...item }))
      : [],
    loadedWindows: Array.isArray(record.loadedWindows)
      ? record.loadedWindows.map((item) => ({ ...item }))
      : [],
    paneIds: Array.isArray(record.paneIds) ? [...record.paneIds] : [],
    replayState: record.replayState ? { ...record.replayState } : null,
    sourceBar: record.sourceBar ? { ...record.sourceBar } : null,
  };
}

function normalizePaneIds(paneIds = []) {
  if (!Array.isArray(paneIds)) {
    throw new Error('Replay navigation paneIds must be an array.');
  }
  return [...new Set(paneIds
    .map((paneId) => String(paneId || '').trim())
    .filter(Boolean))];
}

export function createReplayNavigationRuntime({
  dispatchCommand = dispatchRuntimeCommand,
  hasCommand = hasRuntimeCommand,
  materializeCursor = appendReplayCursorAcrossPanes,
  resolveTarget = resolveReplayNavigationTarget,
} = {}) {
  const unregisterCallbacks = [];
  let inFlight = false;
  let state = {
    error: null,
    lastResult: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      inFlight: inFlight && state.status === 'resolving',
      lastResult: cloneRecord(state.lastResult),
      status: state.status,
    };
  }

  function reject({ action, details = {}, emitEvent, error = null, reason }) {
    const result = {
      action: action || null,
      ...details,
      reason,
      status: 'rejected',
    };
    state = {
      error,
      lastResult: result,
      status: 'rejected',
    };
    emitEvent?.(REPLAY_NAVIGATION_EVENTS.REJECTED, cloneRecord(result));
    return getState();
  }

  async function resolvePaneIds(payload = {}) {
    const paneIds = normalizePaneIds(payload.paneIds || []);
    if (paneIds.length) return paneIds;
    const activePane = await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
    if (!activePane?.id) {
      throw new Error('Replay navigation requires at least one pane.');
    }
    return [String(activePane.id)];
  }

  async function navigate(payload = {}, emitEvent) {
    const action = String(payload.action || '').trim() || null;
    if (inFlight) {
      const result = {
        action,
        reason: 'in-flight',
        status: 'rejected',
      };
      emitEvent?.(REPLAY_NAVIGATION_EVENTS.REJECTED, cloneRecord(result));
      return {
        ...getState(),
        requestResult: result,
      };
    }

    inFlight = true;
    state = { error: null, lastResult: null, status: 'resolving' };
    try {
      const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      if (!replayState || replayState.status === 'ended') {
        return reject({ action, emitEvent, reason: 'replay-ended' });
      }
      const paneIds = await resolvePaneIds(payload);
      const pane = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneIds[0]);
      const anchors = await dispatchCommand(REPLAY_NAVIGATION_PREFERENCES_COMMANDS.GET_SNAPSHOT);
      const target = await resolveTarget({
        action,
        anchors,
        dispatchCommand,
        maxCandidates: payload.maxCandidates,
        maxDistanceMinutes: payload.maxDistanceMinutes,
        pane: pane || {},
        replayState,
      });
      if (target.status !== 'resolved') {
        return reject({
          action,
          details: { attemptedCandidates: target.attemptedCandidates ?? 0 },
          emitEvent,
          reason: target.reason || 'target-unresolved',
        });
      }

      if (hasCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP)) {
        await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
      } else {
        await dispatchCommand(REPLAY_COMMANDS.PAUSE);
      }
      const advancedReplayState = await dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: target.sourceCursorTime,
      });
      const materialized = await materializeCursor({
        dispatchCommand,
        hasCommand,
        paneIds,
        replayState: advancedReplayState,
      });
      const result = {
        action: target.action,
        appendedBarCount: materialized.appendedBarCount,
        attemptedCandidates: target.attemptedCandidates,
        candidate: target.candidate,
        chartRecords: materialized.chartRecords,
        fromCursorTime: replayState.cursorTime,
        loadedWindows: materialized.loadedWindows,
        paneIds,
        replayState: advancedReplayState,
        sourceBar: target.sourceBar,
        sourceCursorTime: target.sourceCursorTime,
        status: 'completed',
      };
      state = { error: null, lastResult: result, status: 'completed' };
      emitEvent?.(REPLAY_NAVIGATION_EVENTS.COMPLETED, cloneRecord(result));
      return getState();
    } catch (error) {
      return reject({
        action,
        emitEvent,
        error: error?.message || String(error),
        reason: 'navigation-error',
      });
    } finally {
      inFlight = false;
    }
  }

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(REPLAY_NAVIGATION_COMMANDS.GET_STATE, () => getState()),
      registerCommand(REPLAY_NAVIGATION_COMMANDS.NAVIGATE, (payload) => navigate(payload, emitEvent)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) unregisterCallbacks.pop()();
    inFlight = false;
    state = { error: null, lastResult: null, status: 'idle' };
  }

  return Object.freeze({
    id: 'runtime.replay-navigation',
    start,
    stop,
  });
}
