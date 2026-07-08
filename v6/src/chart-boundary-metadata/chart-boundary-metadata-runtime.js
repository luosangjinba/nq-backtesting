import {
  BAR_DATA_COMMANDS,
  BAR_DATA_EVENTS,
  CHART_BOUNDARY_METADATA_COMMANDS,
  CHART_BOUNDARY_METADATA_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneMetadata(metadata = {}) {
  return {
    scope: metadata.scope ? { ...metadata.scope } : null,
    scopes: Array.isArray(metadata.scopes)
      ? metadata.scopes.map((scope) => ({ ...scope }))
      : [],
    windowCount: Number(metadata.windowCount) || 0,
  };
}

export function createChartBoundaryMetadataRuntime() {
  const unregisterCallbacks = [];
  let refreshQueued = false;
  let state = {
    error: null,
    metadata: {
      scope: null,
      scopes: [],
      windowCount: 0,
    },
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      metadata: cloneMetadata(state.metadata),
      status: state.status,
    };
  }

  async function refresh(emitEvent) {
    try {
      const metadata = await dispatchCommand(BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA);
      state = {
        error: null,
        metadata: cloneMetadata(metadata),
        status: 'ready',
      };
      emitEvent?.(CHART_BOUNDARY_METADATA_EVENTS.UPDATED, getState());
      return getState();
    } catch (error) {
      state = {
        ...state,
        error: error?.message || String(error),
        status: 'error',
      };
      return getState();
    }
  }

  function scheduleRefresh(emitEvent) {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      void refresh(emitEvent);
    });
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_BOUNDARY_METADATA_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_BOUNDARY_METADATA_COMMANDS.REFRESH, () => refresh(emitEvent)),
    );
    if (typeof subscribeEvent === 'function') {
      unregisterCallbacks.push(
        subscribeEvent(BAR_DATA_EVENTS.WINDOW_LOADED, () => scheduleRefresh(emitEvent)),
        subscribeEvent(BAR_DATA_EVENTS.WINDOW_RELEASED, () => scheduleRefresh(emitEvent)),
      );
    }
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    refreshQueued = false;
    state = {
      error: null,
      metadata: {
        scope: null,
        scopes: [],
        windowCount: 0,
      },
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chart-boundary-metadata',
    start,
    stop,
  };
}
