import {
  CHART_DATA_EVENTS,
  CHART_VIEWPORT_COMMANDS,
  CHART_VIEWPORT_EVENTS,
  REPLAY_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createChartViewportStore } from './chart-viewport-store.js';

function cursorTimestampFromReplayPayload(payload = {}) {
  const value = payload.cursorTimestamp ?? payload.timestamp ?? payload.cursorTime;
  const timestamp = typeof value === 'number'
    ? value
    : Math.floor(new Date(value).valueOf() / 1000);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Chart viewport replay cursor payload must include a valid cursor time.');
  }
  return timestamp;
}

function latestLogicalIndexFromChartDataRecord(record = {}) {
  const barCount = Array.isArray(record.bars) ? record.bars.length : 0;
  return Math.max(0, barCount - 1);
}

export function createChartViewportRuntime({
  store = createChartViewportStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent, subscribeEvent } = {}) {
    const emit = emitEvent || (() => {});

    unregisterCallbacks.push(
      registerCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, (payload = {}) => {
        const record = store.ensureIntent(payload.paneId, payload);
        emit(CHART_VIEWPORT_EVENTS.INTENT_CHANGED, record);
        return record;
      }),
      registerCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, (payload = {}) => {
        const record = store.setManualIntent(payload.paneId, payload);
        emit(CHART_VIEWPORT_EVENTS.INTENT_CHANGED, record);
        return record;
      }),
      registerCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, (payload = {}) => {
        const record = store.applyChartDataRevision(payload.paneId, payload);
        emit(CHART_VIEWPORT_EVENTS.PROJECTED, record);
        return record;
      }),
      registerCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, ({ paneId } = {}) => store.getRecord(paneId)),
      registerCommand(CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT, () => store.snapshot())
    );

    if (typeof subscribeEvent === 'function') {
      const updateCursor = (payload = {}) => {
        const records = store.updateCursor(cursorTimestampFromReplayPayload(payload));
        records.forEach((record) => emit(CHART_VIEWPORT_EVENTS.INTENT_CHANGED, record));
      };
      unregisterCallbacks.push(
        subscribeEvent(REPLAY_EVENTS.LOADED, updateCursor),
        subscribeEvent(REPLAY_EVENTS.ADVANCED, updateCursor),
        subscribeEvent(REPLAY_EVENTS.RESET, updateCursor),
        subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload = {}) => {
          const record = payload.record || {};
          const paneId = record.paneId;
          if (!paneId || !store.getRecord(paneId)) return;
          const projected = store.applyChartDataRevision(paneId, {
            chartBarsRevision: record.revision,
            latestLogicalIndex: latestLogicalIndexFromChartDataRecord(record),
          });
          emit(CHART_VIEWPORT_EVENTS.PROJECTED, projected);
        })
      );
    }
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.chart-viewport',
    start,
    stop,
  };
}
