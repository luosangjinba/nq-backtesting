import {
  BAR_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_COMMANDS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, hasCommand, registerCommand } from '../runtime/commands.js';
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
    projectionSource: prepared.projectionSource ? { ...prepared.projectionSource } : null,
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

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Chart entry projection preparation ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeSourceTimeframe(plan, cacheRecord) {
  return normalizePositiveInteger(
    plan?.context?.loadedWindow?.timeframe
      ?? plan?.context?.plannedWindow?.timeframe
      ?? cacheRecord?.timeframe
      ?? 1,
    'sourceTimeframe',
  );
}

function parseCursorTimestamp(cursorTime) {
  const timestamp = Math.floor(new Date(String(cursorTime || '')).valueOf() / 1000);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Chart entry projection preparation cursorTime must be a valid date/time.');
  }
  return timestamp;
}

function parseOptionalTimestamp(value, fieldName) {
  if (value === null || value === undefined || value === '') return null;
  const timestamp = Math.floor(new Date(String(value)).valueOf() / 1000);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Chart entry projection preparation ${fieldName} must be a valid date/time.`);
  }
  return timestamp;
}

async function resolveDisplayTimeframe(plan, optionsDisplayTimeframe) {
  if (optionsDisplayTimeframe !== null && optionsDisplayTimeframe !== undefined) {
    return normalizePositiveInteger(optionsDisplayTimeframe, 'displayTimeframe');
  }
  if (hasCommand(PANE_COMMANDS.GET_BY_ID)) {
    const pane = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, plan.paneId);
    if (pane?.displayTimeframe) {
      return normalizePositiveInteger(pane.displayTimeframe, 'displayTimeframe');
    }
  }
  return null;
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
      const sourceTimeframe = normalizeSourceTimeframe(plan, cacheRecord);
      const displayTimeframe = await resolveDisplayTimeframe(plan, options.displayTimeframe);
      let projectionRecord = null;
      if (
        displayTimeframe !== null
        && displayTimeframe > sourceTimeframe
        && hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)
      ) {
        projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
          bars: cacheRecord.bars,
          cursorTimestamp: parseCursorTimestamp(plan.cursorTime),
          paneId: plan.paneId,
          sessionStartTimestamp: parseOptionalTimestamp(plan.sessionStartTime, 'sessionStartTime')
            ?? cacheRecord.bars?.[0]?.timestamp
            ?? null,
          sourceTimeframe,
          targetTimeframe: displayTimeframe,
        });
      }
      const prepared = createChartEntryProjectionPreparation(plan, cacheRecord, {
        ...options,
        displayTimeframe,
        projectionRecord,
      });
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
