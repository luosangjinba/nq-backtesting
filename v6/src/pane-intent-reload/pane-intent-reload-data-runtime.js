import {
  BAR_DATA_COMMANDS,
  PANE_INTENT_RELOAD_DATA_COMMANDS,
  PANE_INTENT_RELOAD_DATA_EVENTS,
  PANE_INTENT_RELOAD_PLAN_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneWindow(window = {}) {
  return { ...window };
}

function cloneLoadedWindow(record = {}) {
  return record ? {
    barCount: Number.isFinite(Number(record.barCount))
      ? Number(record.barCount)
      : (Array.isArray(record.bars) ? record.bars.length : 0),
    cacheHit: Boolean(record.cacheHit),
    coveredByKey: record.coveredByKey || null,
    history: record.history ? { ...record.history } : null,
    key: record.key || null,
    requestedRange: record.requestedRange ? { ...record.requestedRange } : null,
    timing: record.timing ? { ...record.timing } : null,
  } : null;
}

function cloneRecord(record = {}) {
  return {
    displayTimeframe: record.displayTimeframe,
    loadedWindow: cloneLoadedWindow(record.loadedWindow),
    noFuture: Boolean(record.noFuture),
    paneId: record.paneId,
    reason: record.reason,
    sessionStartTime: record.sessionStartTime,
    sourceTimeframe: record.sourceTimeframe,
    source: record.source,
    window: cloneWindow(record.window),
  };
}

function cloneRecords(records = []) {
  return records.map(cloneRecord);
}

function createInitialState() {
  return {
    lastError: null,
    lastLoaded: [],
    loadedCount: 0,
    status: 'idle',
  };
}

export function createPaneIntentReloadDataRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let state = createInitialState();

  function publishLoaded(records = []) {
    const loaded = cloneRecords(records);
    state = {
      lastError: null,
      lastLoaded: loaded,
      loadedCount: state.loadedCount + loaded.length,
      status: loaded.length ? 'loaded' : state.status,
    };
    if (loaded.length) {
      emit(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, loaded);
    }
    return loaded;
  }

  function recordError(error) {
    state = {
      ...state,
      lastError: error instanceof Error ? error.message : String(error),
      status: 'error',
    };
  }

  async function loadPlannedWindows(plans = []) {
    try {
      const records = [];
      for (const plan of plans) {
        const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, plan.window);
        records.push({
          displayTimeframe: plan.displayTimeframe,
          loadedWindow,
          noFuture: plan.noFuture,
          paneId: plan.paneId,
          reason: plan.reason,
          sessionStartTime: plan.sessionStartTime,
          sourceTimeframe: plan.sourceTimeframe,
          source: plan.source,
          window: plan.window,
        });
      }
      return publishLoaded(records);
    } catch (error) {
      recordError(error);
      return [];
    }
  }

  function getState() {
    return {
      lastError: state.lastError,
      lastLoaded: cloneRecords(state.lastLoaded),
      loadedCount: state.loadedCount,
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_RELOAD_DATA_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(PANE_INTENT_RELOAD_PLAN_EVENTS.PLANNED, (plans) => {
          void loadPlannedWindows(plans);
        }),
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
    emit = () => {};
    state = createInitialState();
  }

  return {
    id: 'runtime.paneIntentReloadData',
    start,
    stop,
  };
}
