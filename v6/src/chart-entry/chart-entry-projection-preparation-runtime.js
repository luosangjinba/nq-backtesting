import {
  BAR_DATA_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { createChartEntryProjectionPreparation } from './chart-entry-projection-preparation.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function clonePrepared(prepared) {
  return prepared ? {
    ...prepared,
    chartReplacePayload: {
      ...prepared.chartReplacePayload,
      bars: cloneBars(prepared.chartReplacePayload?.bars),
    },
    source: {
      ...prepared.source,
      window: prepared.source?.window ? { ...prepared.source.window } : null,
    },
    viewportIntentPayload: { ...prepared.viewportIntentPayload },
    wallPlan: { ...prepared.wallPlan },
    wallState: {
      ...prepared.wallState,
      latestBar: prepared.wallState?.latestBar ? { ...prepared.wallState.latestBar } : null,
      projection: prepared.wallState?.projection ? { ...prepared.wallState.projection } : null,
      settings: prepared.wallState?.settings ? { ...prepared.wallState.settings } : null,
    },
  } : null;
}

export function createChartEntryProjectionPreparationRuntime(options = {}) {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let state = {
    error: null,
    prepared: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      prepared: clonePrepared(state.prepared),
      status: state.status,
    };
  }

  async function prepareProjection(plan, emitEvent) {
    try {
      if (!plan?.context?.loadedWindow && !plan?.context?.plannedWindow) {
        throw new Error('Chart entry projection preparation requires a context window.');
      }
      const cacheRecord = await dispatchCommand(
        BAR_DATA_COMMANDS.GET_WINDOW,
        plan.context.loadedWindow || plan.context.plannedWindow,
      );
      if (!cacheRecord) {
        throw new Error('Chart entry projection preparation cache window is missing.');
      }
      const prepared = createChartEntryProjectionPreparation(plan, cacheRecord, options);
      state = {
        error: null,
        prepared,
        status: 'prepared',
      };
      emitEvent?.(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, getState().prepared);
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        prepared: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, (plan) => {
          void prepareProjection(plan, emitEvent);
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
      prepared: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryProjectionPreparation',
    start,
    stop,
  };
}
