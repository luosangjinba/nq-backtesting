import {
  CHART_VIEWPORT_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_EVENTS,
  PANE_INTENT_RELOAD_VIEWPORT_COMMANDS,
  PANE_INTENT_RELOAD_VIEWPORT_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneWindow(window = {}) {
  return { ...window };
}

function cloneProjection(record = {}) {
  return {
    chartBarsRevision: Number(record.chartBarsRevision || 0),
    cursorTimestamp: record.cursorTimestamp ?? null,
    latestLogicalIndex: Number(record.latestLogicalIndex || 0),
    paneId: record.paneId,
    projected: record.projected ? { ...record.projected } : null,
    window: cloneWindow(record.window),
  };
}

function cloneProjections(records = []) {
  return records.map(cloneProjection);
}

function createInitialState() {
  return {
    lastError: null,
    lastProjected: [],
    projectedCount: 0,
    status: 'idle',
  };
}

function latestLogicalIndex(record = {}) {
  const barCount = Array.isArray(record.chartRecord?.bars)
    ? record.chartRecord.bars.length
    : Number(record.barCount || 0);
  return Math.max(0, barCount - 1);
}

export function createPaneIntentReloadViewportRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let state = createInitialState();

  function publishProjected(records = []) {
    const projected = cloneProjections(records);
    state = {
      lastError: null,
      lastProjected: projected,
      projectedCount: state.projectedCount + projected.length,
      status: projected.length ? 'projected' : state.status,
    };
    if (projected.length) {
      emit(PANE_INTENT_RELOAD_VIEWPORT_EVENTS.PROJECTED, projected);
    }
    return projected;
  }

  function recordError(error) {
    state = {
      ...state,
      lastError: error instanceof Error ? error.message : String(error),
      status: 'error',
    };
  }

  async function projectReplacements(replacements = []) {
    try {
      const projectedRecords = [];
      for (const replacement of replacements) {
        const paneId = replacement.paneId;
        const cursorTimestamp = replacement.cursorTimestamp;
        const logicalIndex = latestLogicalIndex(replacement);
        await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
          cursorTimestamp,
          paneId,
        });
        const projected = await dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
          chartBarsRevision: replacement.chartRecord?.revision,
          latestLogicalIndex: logicalIndex,
          paneId,
        });
        projectedRecords.push({
          chartBarsRevision: replacement.chartRecord?.revision,
          cursorTimestamp,
          latestLogicalIndex: logicalIndex,
          paneId,
          projected,
          window: replacement.window,
        });
      }
      return publishProjected(projectedRecords);
    } catch (error) {
      recordError(error);
      return [];
    }
  }

  function getState() {
    return {
      lastError: state.lastError,
      lastProjected: cloneProjections(state.lastProjected),
      projectedCount: state.projectedCount,
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_RELOAD_VIEWPORT_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, (records) => {
          void projectReplacements(records);
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
    id: 'runtime.paneIntentReloadViewport',
    start,
    stop,
  };
}
