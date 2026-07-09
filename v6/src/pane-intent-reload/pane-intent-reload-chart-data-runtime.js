import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_COMMANDS,
  PANE_INTENT_RELOAD_CHART_DATA_EVENTS,
  PANE_INTENT_RELOAD_DATA_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, hasCommand, registerCommand } from '../runtime/commands.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

function cloneWindow(window = {}) {
  return { ...window };
}

function cloneChartRecord(record = {}) {
  return {
    bars: cloneBars(record.bars),
    paneId: record.paneId || '',
    revision: Number(record.revision || 0),
  };
}

function cloneReplacement(record = {}) {
  return {
    barCount: Number(record.barCount || 0),
    chartRecord: cloneChartRecord(record.chartRecord),
    cursorTimestamp: record.cursorTimestamp ?? null,
    noFuture: Boolean(record.noFuture),
    paneId: record.paneId,
    projectionSource: record.projectionSource ? { ...record.projectionSource } : null,
    reason: record.reason,
    source: record.source,
    window: cloneWindow(record.window),
  };
}

function cloneReplacements(records = []) {
  return records.map(cloneReplacement);
}

function createInitialState() {
  return {
    lastError: null,
    lastReplaced: [],
    replacedCount: 0,
    status: 'idle',
  };
}

function cursorTimestampFromWindow(window = {}) {
  const value = window.end || window.anchor;
  const normalized = String(value || '').includes('T')
    ? String(value)
    : `${String(value || '').replace(' ', 'T')}Z`;
  const timestamp = Math.floor(Date.parse(normalized) / 1000);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Pane intent reload chart-data replacement requires a finite window cursor timestamp.');
  }
  return timestamp;
}

function normalizeTimeframe(value = 1, fieldName = 'timeframe') {
  const timeframe = Number(value);
  if (!Number.isInteger(timeframe) || timeframe <= 0) {
    throw new Error(`Pane intent reload chart-data replacement ${fieldName} must be a positive integer.`);
  }
  return timeframe;
}

async function createReplacementBars({
  cursorTimestamp,
  loadedWindow,
  paneId,
  window,
} = {}) {
  const targetTimeframe = normalizeTimeframe(window.timeframe, 'targetTimeframe');
  const sourceTimeframe = normalizeTimeframe(loadedWindow.timeframe ?? window.timeframe, 'sourceTimeframe');
  if (targetTimeframe <= 1 || !hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)) {
    return {
      bars: loadedWindow.bars,
      projectionRecord: null,
    };
  }

  const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
    bars: loadedWindow.bars,
    cursorTimestamp,
    paneId,
    sessionStartTimestamp: loadedWindow.bars?.[0]?.timestamp ?? null,
    sourceTimeframe,
    targetTimeframe,
  });
  return {
    bars: projectionRecord.bars,
    projectionRecord,
  };
}

export function createPaneIntentReloadChartDataRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let state = createInitialState();

  function publishReplaced(records = []) {
    const replaced = cloneReplacements(records);
    state = {
      lastError: null,
      lastReplaced: replaced,
      replacedCount: state.replacedCount + replaced.length,
      status: replaced.length ? 'replaced' : state.status,
    };
    if (replaced.length) {
      emit(PANE_INTENT_RELOAD_CHART_DATA_EVENTS.REPLACED, replaced);
    }
    return replaced;
  }

  function recordError(error) {
    state = {
      ...state,
      lastError: error instanceof Error ? error.message : String(error),
      status: 'error',
    };
  }

  async function replaceLoadedWindows(records = []) {
    try {
      const replacements = [];
      for (const record of records) {
        const loadedWindow = await dispatchCommand(BAR_DATA_COMMANDS.GET_WINDOW, record.window);
        if (!loadedWindow) {
          throw new Error(`Pane intent reload chart-data replacement missing bar-data window for pane ${record.paneId}.`);
        }
        const cursorTimestamp = cursorTimestampFromWindow(record.window);
        const replacementBars = await createReplacementBars({
          cursorTimestamp,
          loadedWindow,
          paneId: record.paneId,
          window: record.window,
        });
        const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
          bars: replacementBars.bars,
          cursorTimestamp,
          paneId: record.paneId,
        });
        replacements.push({
          barCount: chartRecord.bars.length,
          chartRecord,
          cursorTimestamp,
          noFuture: record.noFuture,
          paneId: record.paneId,
          projectionSource: replacementBars.projectionRecord ? {
            bucketCount: replacementBars.projectionRecord.buckets?.length ?? 0,
            owner: 'runtime.chart-data-projection',
            projectionRevision: replacementBars.projectionRecord.projectionRevision ?? null,
            sourceBarCount: replacementBars.projectionRecord.sourceBarCount ?? null,
            sourceTimeframe: replacementBars.projectionRecord.sourceTimeframe ?? null,
            targetTimeframe: replacementBars.projectionRecord.targetTimeframe ?? null,
          } : null,
          reason: record.reason,
          source: record.source,
          window: record.window,
        });
      }
      return publishReplaced(replacements);
    } catch (error) {
      recordError(error);
      return [];
    }
  }

  function getState() {
    return {
      lastError: state.lastError,
      lastReplaced: cloneReplacements(state.lastReplaced),
      replacedCount: state.replacedCount,
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_RELOAD_CHART_DATA_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(PANE_INTENT_RELOAD_DATA_EVENTS.LOADED, (records) => {
          void replaceLoadedWindows(records);
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
    id: 'runtime.paneIntentReloadChartData',
    start,
    stop,
  };
}
