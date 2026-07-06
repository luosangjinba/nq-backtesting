import {
  BAR_DATA_COMMANDS,
  CHART_ENTRY_CONTEXT_COMMANDS,
  CHART_ENTRY_CONTEXT_EVENTS,
  CHART_ENTRY_INITIALIZATION_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneWindow(window) {
  return window ? { ...window } : null;
}

function pickLoadedWindow(record) {
  if (!record) return null;
  return {
    bounded: Boolean(record.bounded),
    end: record.end,
    estimatedBars: record.estimatedBars,
    instrument: record.instrument,
    start: record.start,
    timeframe: record.timeframe,
  };
}

function summarizeRecord(record) {
  if (!record) return null;
  return {
    barCount: Array.isArray(record.bars) ? record.bars.length : 0,
    cacheHit: Boolean(record.cacheHit),
    coveredByKey: record.coveredByKey || null,
    key: record.key || null,
    requestedRange: record.requestedRange ? { ...record.requestedRange } : null,
    timing: record.timing ? { ...record.timing } : null,
  };
}

function cloneLoaded(loaded) {
  return loaded ? {
    anchor: loaded.anchor,
    loadedWindow: cloneWindow(loaded.loadedWindow),
    plannedWindow: cloneWindow(loaded.plannedWindow),
    record: loaded.record ? { ...loaded.record } : null,
    sessionId: loaded.sessionId,
  } : null;
}

export function createChartEntryContextRuntime() {
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

  async function loadContext(plan, emitEvent) {
    try {
      if (!plan?.sessionId) {
        throw new Error('Chart entry context load requires a session id.');
      }
      if (!plan?.plannedWindow) {
        throw new Error('Chart entry context load requires a planned window.');
      }
      const record = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, plan.plannedWindow);
      state = {
        error: null,
        loaded: {
          anchor: plan.startBarAnchor,
          loadedWindow: pickLoadedWindow(record),
          plannedWindow: cloneWindow(plan.plannedWindow),
          record: summarizeRecord(record),
          sessionId: plan.sessionId,
        },
        status: 'loaded',
      };
      emitEvent?.(CHART_ENTRY_CONTEXT_EVENTS.LOADED, getState().loaded);
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
      registerCommand(CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED, (plan) => {
          void loadContext(plan, emitEvent);
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
    id: 'runtime.chartEntryContext',
    start,
    stop,
  };
}
