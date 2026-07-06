import {
  CHART_DATA_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_COMMANDS,
  CHART_ENTRY_PROJECTION_APPLY_EVENTS,
  CHART_ENTRY_PROJECTION_PREPARATION_EVENTS,
  CHART_VIEWPORT_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneRecord(record) {
  return record ? {
    ...record,
    bars: Array.isArray(record.bars) ? cloneBars(record.bars) : record.bars,
    projection: record.projection ? { ...record.projection } : record.projection,
    settings: record.settings ? { ...record.settings } : record.settings,
  } : null;
}

function cloneApplied(applied) {
  return applied ? {
    chartRecord: cloneRecord(applied.chartRecord),
    sessionId: applied.sessionId,
    viewportRecord: cloneRecord(applied.viewportRecord),
  } : null;
}

export function createChartEntryProjectionApplyRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let state = {
    applied: null,
    error: null,
    status: 'idle',
  };

  function getState() {
    return {
      applied: cloneApplied(state.applied),
      error: state.error,
      status: state.status,
    };
  }

  async function applyProjection(prepared, emitEvent) {
    try {
      if (!prepared?.viewportIntentPayload) {
        throw new Error('Chart entry projection apply requires a viewport intent payload.');
      }
      if (!prepared?.chartReplacePayload) {
        throw new Error('Chart entry projection apply requires a chart replace payload.');
      }
      const viewportRecord = await dispatchCommand(
        CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
        prepared.viewportIntentPayload,
      );
      const chartRecord = await dispatchCommand(
        CHART_DATA_COMMANDS.REPLACE_BARS,
        prepared.chartReplacePayload,
      );
      state = {
        applied: {
          chartRecord,
          sessionId: prepared.sessionId,
          viewportRecord,
        },
        error: null,
        status: 'applied',
      };
      emitEvent?.(CHART_ENTRY_PROJECTION_APPLY_EVENTS.APPLIED, getState().applied);
      return getState();
    } catch (error) {
      state = {
        applied: null,
        error: error?.message || String(error),
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_PROJECTION_PREPARATION_EVENTS.PREPARED, (prepared) => {
          void applyProjection(prepared, emitEvent);
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
      applied: null,
      error: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryProjectionApply',
    start,
    stop,
  };
}
